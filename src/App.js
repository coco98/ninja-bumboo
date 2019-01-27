import React, { Component } from 'react';
import './App.css';

class App extends Component {
  goTo(route) {
    this.props.history.replace(`/${route}`)
  }

  login() {
    this.props.auth.login();
  }

  logout() {
    this.props.auth.logout();
  }

  componentDidMount() {
    const { renewSession } = this.props.auth;

    if (localStorage.getItem('isLoggedIn') === 'true') {
      renewSession();
    }
  }

  render() {
    const { isAuthenticated } = this.props.auth;
    let isLoggedIn = false;
    let isMaster = false;

    if (isAuthenticated()) {
      isLoggedIn = true;
      isMaster = this.props.auth.isMaster();
    }

    if (!isLoggedIn) {
      return (
        <div className="flex-no-padding">
          <button className="big-button" type="submit" onClick={this.login.bind(this)}>Login</button>
        </div>
      );
    }

    if (isMaster) {
      return (
        <div className="flex-no-padding">
          <button className="big-button" type="submit" onClick={this.goTo.bind(this, 'master')}>Start</button>
          <hr/>
          <button className="big-button" type="submit" onClick={this.logout.bind(this)}>Logout</button>
        </div>
      );
    }
    return (
      <div className="flex-no-padding">
        <button className="big-button" type="submit" onClick={this.goTo.bind(this, 'gamer')}>Start</button>
        <hr/>
        <button className="big-button" type="submit" onClick={this.logout.bind(this)}>Logout</button>
      </div>
    );
  }
}

export default App;
