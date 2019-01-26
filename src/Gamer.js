import React, { Component } from 'react';
import {Mutation, Subscription} from 'react-apollo';
import gql from 'graphql-tag';
import Loading from './Callback/Callback';

const NoGame = () => {
  return (
    <div className="question">
      <h3>No active game 4 u. Pliss wait...😅</h3>
    </div>);
};

const JOIN_GAME = gql`
mutation($gameId:uuid!, $userId:String!) {
  insert_players(objects: [{game_id: $gameId, user_id: $userId}]) {
    affected_rows
  }
}
`;
const JoinGame = (props) => (
  <Mutation
    mutation={JOIN_GAME}>
    {(joinGame, {loading, error, data}) => {
      return (
        <div className="flex-no-padding">
          <button type="submit" className="big-button" onClick={() => {
            joinGame({variables: {gameId: props.gameId, userId: props.userId}});
          }} disabled={loading || data}>
            {(loading || data) ? 'joining...' : `Join game ${props.name}!`}
          </button>
        </div>);
    }}
  </Mutation>
);

const WaitingToStart = (props) => (
  <div className="question">
    <h3>{props.label}</h3>
  </div>
);

const Option = (props) => (
  <div className="answer-option">
    <h3>{props.name}</h3>
  </div>
);

const ANSWER = gql`
mutation($questionId: uuid!, $userId: String!, $answer: String!) {
  insert_answers(objects: [{question_id: $questionId, user_id: $userId, answer: $answer}]) {
    affected_rows
  }
}
`;
const ShowOptions = (props) => (
  <Mutation mutation={ANSWER}>
    {(answer, {loading, error, data }) => {
      const options = JSON.parse(JSON.stringify(props.question.data.options));
      options.sort((a, b) => {
        if (a.name > b.name) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }
        return 0;
      });

      const handleClick = (optionName) => {
        return (e) => {
          answer({variables: {questionId: props.question.id, userId: props.userId, answer: optionName}});
        }
      };

      if (loading || data) {
        return <Loading />;
      }

      return (
        <div className="flex-no-padding">
          <table className="gamer-options">
            <tbody>
              <tr>
                <td onClick={handleClick(options[0].name)}><Option {...options[0]} /></td>
                <td onClick={handleClick(options[1].name)}><Option {...options[1]} /></td>
              </tr>
              <tr>
                <td onClick={handleClick(options[2].name)}><Option {...options[2]} /> </td>
                <td onClick={handleClick(options[3].name)}><Option {...options[3]} /> </td>
              </tr>
            </tbody>
          </table>
        </div>);
    }}
  </Mutation>
);

const GET_GAME = gql`
subscription($userId: String!) {
  games(where:{is_current: {_eq: true}}) {
    id
    name
    has_started

    questions(where: {is_current:{_eq: true}}) {
      id
      data {
        options {
          name
        }
      }
      answers (where: {user_id: {_eq: $userId}}) {
        user_id
      }
    }

    players (where: {user_id: {_eq: $userId}}) {
      user_id
      eliminated
      winner
    }
  }
}
`;

const Gamer = (props) => (
  <Subscription
    subscription={GET_GAME}
    variables={{userId: props.auth.getId()}}>
    {({ loading, error, data }) => {
      if (loading) return <Loading />;
      if (error) return `Error! ${error.message}`;

      if (data.games.length === 0) {
        return <NoGame />;
      }

      const game = data.games[0];
      const hasStarted = game.has_started;
      const hasJoinedGame = game.players.find(p => (p.user_id === props.auth.getId()));

      if (hasStarted && !hasJoinedGame) {
        return <WaitingToStart label="This game has already started. Wait for the next one." />;
      }

      if (!hasStarted && !hasJoinedGame) {
        return <JoinGame name={game.name} gameId={game.id} userId={props.auth.getId()} />;
      }

      if(!hasStarted && hasJoinedGame) {
        return <WaitingToStart label="Waiting to start game..." />;
      }

      // Now: hasStarted && hasJoinedGame

      // Am I eliminated? :(
      if (game.players[0].eliminated) {
        return <WaitingToStart label="Boo 😞. You're eliminated." />;
      }

      // Am I a winner? :)
      if (game.players[0].winner) {
        return <WaitingToStart label="Holy 💩. You won 🎉" />;
      }

      // Is a question available?
      if (game.questions.length === 0) {
        return <WaitingToStart label="Waiting for ze question..." />;
      }

      const hasAnsweredCurrentQuestion = !(game.questions[0].answers.length === 0);
      if(hasAnsweredCurrentQuestion) {
        return <WaitingToStart label="Waiting for next question..." />;
      }

      // else
      const question = game.questions[0];
      return <ShowOptions question={question} userId={props.auth.getId()} />;
    }}
  </Subscription>
);

export default Gamer;
