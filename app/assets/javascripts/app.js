"use strict";
define([
    'jquery',
    'backbone',
    'authentication',
    'models',
    'collections',
    'vent',
    'views/admin',
    'views/public',
    'views/signup'
], function($, bb, authentication, models, collections, vent, admin, pub, signup) {

    var contentEl;

    var ApplicationRouter = bb.Router.extend({
	routes: {
	    'admin' : 'showAdminScreen',
	    'party/:id' : 'showPublicScreen',
	    'party/id/:id' : 'showPublicScreenById',
	    'sign_up' : 'showSignUpScreen',
	    'edit-own-details' : 'showOwnDetailsEditor',
	    'login'   : 'startingPage'
	},

	initialize: function() {
	    _.bindAll(this);
	    vent.on('user-created', this.startingPage);
	    vent.on('logged-in', this.loggedIn);
	},
	
	loggedIn: function(hash) {
	    if(hash) {
		this.navigate(hash, {trigger: true});
	    } else {
		this.navigate('party/id/0', {trigger: true});
	    }
	},

	startingPage: function() {
	    pub.detach();
	    admin.detach();
	    loginView.render();
	},

	showAdminScreen: function() {
	    pub.detach();
	    admin.initialize({el:contentEl});
	},

	showSignUpScreen: function() {
	    signup.initialize({el:contentEl});
	},
	
	showOwnDetailsEditor: function() {
	    signup.initialize({el:contentEl});
	},

	showPublicScreen: function(title) {
	    admin.detach();
	    pub.initialize({el:contentEl, partyTitle:title, currentUser: authentication.currentUser});
	},

	showPublicScreenById: function(id) {
	    admin.detach();
	    pub.initialize({el:contentEl, partyId:id, currentUser: authentication.currentUser});
	}
    });

    var loginView;

    var initialize = function(options) {
	contentEl = options.el;
	authentication.initialize(function() {
	    if (!authentication.currentUser()) {
		loginView = new authentication.LoginView({el:contentEl});
	    }
	    new ApplicationRouter();
	    bb.history.start();
	});
    };

    return {initialize: initialize};
});
