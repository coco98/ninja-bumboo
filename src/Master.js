import React from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import Master from './Master';
import gql from "graphql-tag";
import { Mutation, Subscription } from "react-apollo";
import Loading from './Callback/Callback';

const CREATE_GAME = gql`
  mutation ($name: String!){
    insert_games(objects:{name: $name}) {
      returning {
        id
        name
        is_current
        has_started
      }
    }
  }
`;

const StartNewGame = () => (
  <Mutation
    mutation={CREATE_GAME}>
    {(createGame, {loading, error, data}) => {
      let nameInput;
      return (
        <div className="start-new-game">
          <h1>Name the game</h1>
          <input className="name-input" type="text" ref={node => {
            nameInput = node;
          }} />
          <hr/>
          <button className="big-button" type="submit" onClick={() => {
            createGame({variables: {name: nameInput.value}});
          }} disabled={loading || data}>{(loading || data) ? 'creating...' : 'Create the game'}</button>
        </div>
      );
      }}
  </Mutation>
);

const Player = (props) => (
  <div className={'player ' + (props.isAnswered ? 'answered ' : '') + (props.isBig ? ' big ' : '')}>
    <img src={props.profile} />
    <b>{props.username}</b>
    <br/>
    <span className="timediff">{props.timeDiff ? ('(' + props.timeDiff.toString() + 's)') : null}</span>
  </div>
);

const START_GAME=gql`
mutation ($id: uuid!){
  update_games(where:{id: {_eq: $id}}, _set: {has_started: true}) {
    returning {
      id
    }
  }
}
`;
const WaitToStartGame = (props) => (
  <Mutation
    mutation={START_GAME}>
    {(startGame, {loading, error, data}) => {
      const players = props.data.players;
      const gameId = props.data.id;
      return (
        <div className="question">
          <div className="players">
            {players.map(p => (
              <Player profile={p.user.profile_pic} username={p.user.username} isAnswered />
            ))}
          </div>
          <button className="big-button" type="submit" onClick={() => {
            startGame({variables: {id: gameId}});
          }} disabled={loading || data}>{(loading || data) ? 'starting....' : 'Start game'}</button>
        </div>
      );
    }}
  </Mutation>
);

const FINISH_GAME = gql`
mutation {
  update_games(where: {is_current: {_eq: true}}, _set: {is_current: false}) {
    affected_rows
  }
}
`;

const AnnounceWinner = (props) => (
  <Mutation mutation={FINISH_GAME}>
    {(finishGame, {loading, error, data }) => {
      console.log(props);
      return (
        <div className="flex-no-padding">
          <h3> The winner is: </h3>
          <Player username={props.winner.user.username} profile={props.winner.user.profile_pic} isBig isAnswered />
          <hr/>
          <button type="submit" className="big-button" onClick={() => {
            finishGame();
          }} disabled={loading || data}>{(loading || data) ? 'Resetting...' : 'Finish 🎉'}</button>
        </div>
      );
    }}
  </Mutation>
);

const LoadGame = (props) => {
  // what state are we in?
  // running a question and waiting for answers
  // all people have answered
  const waitingForAnswers = (props.data.questions && (props.data.questions.length > 0));
  const game = props.data;
  const numPlayers = game.players.filter(p => (!p.eliminated)).length;
  const numAnswers = game.questions[0].answers.length;

  if (numPlayers === 1) {
    return <AnnounceWinner winner={game.players.find(p => (!p.eliminated))} />;
  }
  console.log('Total non-eliminated players: ' + numPlayers);
  console.log('Total answers: ' + numAnswers);

  const everyoneAnswered = (numPlayers == numAnswers);

  if (waitingForAnswers && !everyoneAnswered) {
    const question = JSON.parse(JSON.stringify(props.data.questions[0].data));
    const players = props.data.players;

    question.options.sort((a, b) => {
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 0;
    });

    console.log(game);
    return (
      <div className="question">
        <h1>{question.question}</h1>
        <img src={question.media} />
        <hr/>
        <table>
          <tbody>
            <tr>
              <td><b>{question.options[0].name}</b>: <span>{question.options[0].value}</span></td>
              <td><b>{question.options[1].name}</b>: <span>{question.options[1].value}</span></td>
            </tr>
            <tr>
              <td><b>{question.options[2].name}</b>: <span>{question.options[2].value}</span></td>
              <td><b>{question.options[3].name}</b>: <span>{question.options[3].value}</span></td>
            </tr>
          </tbody>
        </table>
        <hr/>
        <div className="players">
          {players.map(p => {
            console.log(p);
            console.log(game.questions[0].answers.some(a => (a.user_id === p.user_id)));
            return (<Player profile={p.user.profile_pic} username={p.user.username}
              isEliminated={p.eliminated}
              isAnswered={game.questions[0].answers.some(a => (a.user_id === p.user_id))} />);
          })}
        </div>
        <hr/>
      </div>
    )
    } else {
      const question = game.questions[0];
      const unplayedQuestionId = (game.unplayedQuestions.length) ? game.unplayedQuestions[0].id : null;
      return (
        <EliminatePlayer
          question={question}
          gameId={game.id}
          unplayedQuestionId={unplayedQuestionId}
        />);
    }
};

const ELIMINATE_PLAYER = gql`
mutation ($userId: String!, $gameId: uuid!, $questionId: uuid!, $randomId: uuid!) {
  update_players(where:{user_id:{_eq: $userId}, game_id:{ _eq: $gameId}}, _set: {eliminated: true}) {
    affected_rows
  }

  completeQuestion: update_questions(where: {id: {_eq: $questionId}}, _set: {is_played: true}) {
    affected_rows
  }

  nextQuestion: update_questions(where: {id: {_eq: $randomId}}, _set: {is_current: true}) {
    affected_rows
  }
}`;

const ELIMINATE_PLAYER_AND_DECLARE_WINNER = gql`
mutation ($userId: String!, $gameId: uuid!, $winnerId: String!, $questionId: uuid!) {

  eliminate: update_players(where:{user_id:{_eq: $userId}, game_id:{ _eq: $gameId}}, _set: {eliminated: true}) {
    affected_rows
  }

  declareWinner: update_players(where:{user_id:{_eq: $winnerId}, game_id:{ _eq: $gameId}}, _set: {winner: true}) {
    affected_rows
  }

  completeQuestion: update_questions(where: {id: {_eq: $questionId}}, _set: {is_played: true}) {
    affected_rows
  }

}`;


const EliminatePlayer = ({question, gameId, unplayedQuestionId}) => {
  const correctAnswer = question.data.correct_option;

  const fastestFingerSort = (a, b) => {
    if (a.created > b.created) {
      return 1;
    }
    if (a.created < b.created) {
      return -1;
    }
    else {
      return 0;
    }
  }

  const correctPlayers = question.answers.filter(a => (a.answer === correctAnswer)).sort(fastestFingerSort);
  const wrongPlayers = question.answers.filter(a => (a.answer !== correctAnswer)).sort(fastestFingerSort);
  const fastestTime = (new Date((correctPlayers.length ? correctPlayers[0].created : wrongPlayers[0].created))).getTime();

  let slowest;
  if (wrongPlayers.length !== 0) {
    slowest = wrongPlayers[wrongPlayers.length - 1];
  } else {
    slowest = correctPlayers[correctPlayers.length - 1];
  }

  const playersLeft = question.answers.filter(a => (a.user_id !== slowest.user_id));
  const numPlayersLeft = playersLeft.length;
  let mutation = ELIMINATE_PLAYER;
  if (numPlayersLeft === 1) {
    mutation = ELIMINATE_PLAYER_AND_DECLARE_WINNER;
  }

  return (
    <div className="question">
      <h4>
        {question.data.correct_option}:
        {question.data.options.find(o => o.name === question.data.correct_option).value}
      </h4>
      <hr/>
      {(correctPlayers.length !== 0) ?
          (
            <>
            <h3><u>Correct bumboos</u></h3>
              <div className="players">
                {correctPlayers.map((p, i) => {
                  return (<Player key={i} profile={p.user.profile_pic} username={p.user.username} isAnswered
                    timeDiff={((new Date(p.created)).getTime() - fastestTime)/1000.0} />);
                })}
              </div>
              <hr/>
            </>
          ) : null }
      {(wrongPlayers.length !== 0) ?
          (
            <>
              <h3>Wrong bumboos</h3>
              <div className="players">
                {wrongPlayers.map((p, i) => {
                  return (<Player key={i} profile={p.user.profile_pic} username={p.user.username} 
                    timeDiff={((new Date(p.created)).getTime() - fastestTime)/1000.0} />);
                })}
              </div>
              <hr/>
            </>
          ) : null}
      <Mutation mutation={mutation}>
        {(eliminatePlayer, {loading, error, data }) => {
          return (
            <button type="submit" className="big-button" onClick={() => {
              if (numPlayersLeft === 1) {
                eliminatePlayer({variables: {userId: slowest.user_id, gameId, winnerId: playersLeft[0].user_id, questionId: question.id}});
              } else {
                eliminatePlayer({variables: {userId: slowest.user_id, gameId, questionId: question.id, randomId: unplayedQuestionId}});
              }
            }} disabled={(loading || data)}>{(loading || data) ? 'Eliminating...' : `Eliminate ${slowest.user.username}! 😭`}</button>
          );
        }}
      </Mutation>
    </div>);
};

const LoadingQuestions = () => (
  <div className="flex-no-padding">
    <h3>Loading questions...</h3>
  </div>
);

const GET_GAMES = gql`
  subscription {
    games(where:{is_current: {_eq: true}}) {
      id
      name
      is_current
      has_started

      questions(where: {is_current:{_eq: true}}) {
        id
        data {
          question
          correct_option
          media
          options {
            name
            value
          }
        }
        answers {
          user_id
          answer
          created
          user {
            username
            profile_pic
          }
        }
      }

      unplayedQuestions: questions (where: {is_current: {_eq: false}, is_played: {_eq: false}}, limit: 1) {
        id
      }

      players {
        user_id
        eliminated
        user {
          username
          profile_pic
        }
      }

    }
  }
`;

const App = () => (
  <Subscription subscription={GET_GAMES}>
    {({ loading, error, data }) => {
      if (loading) return <Loading />;
      if (error) return `Error! ${error.message}`;

      // Check if there's a game
      if (data.games.length === 0) {
        return (<StartNewGame />);
      }

      // Now that we have a current game
      const game = data.games[0];

      if (!game.has_started) {
        return <WaitToStartGame data={game} />
      }

      // If the game questions have not loaded yet
      if (game.questions.length === 0) {
        return <LoadingQuestions />
      }

      return (<LoadGame data={game} />);
    }}
  </Subscription>
);

export default App;
