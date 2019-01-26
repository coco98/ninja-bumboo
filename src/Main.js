import React from 'react';
import { Route, Router } from 'react-router-dom';
import Auth from './Auth';
import App from './App';
import Callback from './Callback/Callback';
import history from './history';
import Master from './Master';
import Gamer from './Gamer';

// Remove the apollo-boost import and change to this:
import ApolloClient from "apollo-client";
// Setup the network "links"
import { WebSocketLink } from 'apollo-link-ws';
import { SubscriptionClient } from "subscriptions-transport-ws";
import { HttpLink } from 'apollo-link-http';
import { split } from 'apollo-link';
import { getMainDefinition } from 'apollo-utilities';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { ApolloProvider } from "react-apollo";

const httpLink = new HttpLink({
  uri: 'https://ninja-bumboo.herokuapp.com/v1alpha1/graphql',
  headers: {
    'x-hasura-access-key': 'hasuratutorials'
  }
});

// Create a WebSocket link:
const wsLink = new WebSocketLink(new SubscriptionClient(
  'wss://ninja-bumboo.herokuapp.com/v1alpha1/graphql',
  {
    reconnect: true,
    connectionParams: {
      headers: {
        'x-hasura-access-key': 'hasuratutorials'
      }
    }
  }
));

// using the ability to split links, you can send data to each link
// depending on what kind of operation is being sent
const link = split(
  // split based on operation type
  ({ query }) => {
    const { kind, operation } = getMainDefinition(query);
    return kind === 'OperationDefinition' && operation === 'subscription';
  },
  wsLink,
  httpLink,
);

// Instantiate client
const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
})


const auth = new Auth();
const handleAuthentication = ({location}) => {
  if (/access_token|id_token|error/.test(location.hash)) {
    auth.handleAuthentication();
  }
};

const Main = () => {
  return (
      <ApolloProvider client={client}>
        <Router history={history}>
          <div>
            <Route path="/" exact render={(props) => <App auth={auth} {...props} />} />
            <Route path="/callback" render={(props) => {
              handleAuthentication(props);
              return <Callback {...props} />
            }}/>
            <Route path="/master" exact component={Master} />
            <Route path="/gamer" exact render={() => <Gamer auth={auth} />} />
            {/*
              <Route path="/home" render={(props) => <Home auth={auth} {...props} />} />
            */}
          </div>
        </Router>
      </ApolloProvider>
  );
};

export default Main;
