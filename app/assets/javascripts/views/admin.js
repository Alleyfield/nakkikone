"use strict";
define([
    'jquery',
    'underscore',
    'backbone',
    'collections',
    'models',
    'components/notification-area',
    'components/users-list',
    'components/party-selector',
    'components/party-editor',
    'moment',
    'languages',
    'bootstrapDatepicker',
    'bootstrapTimepicker',
    'hbs!templates/admin-screen',
    'hbs!templates/nakit',
    'hbs!templates/edit-nakkis',
    'hbs!templates/email-button'
], function($, _, bb, collections, models, notificationArea, usersList, partySelector, partyEditor, moment, languages, bootstarpDP, bootstarpTP, adminScreen, nakkilist, nakkilist_edit, emailButton) {

    //TODO fix party creation refresh for nakkitypes editor.

    var vent = {};
    _.extend(vent, bb.Events);

    var parties = new collections.Parties();

    var users = new collections.Users();

    var auxUsers = new collections.AuxUsers();

    var nakkitypes = new collections.Nakkitypes();

    var _error = function(collection, xhr, options) {
	//notify shitty accidents, ignore 403 and 401
    };

    var EmailToAll = bb.View.extend({
	events: {
	    'click .mail-to' : 'sendMail'
	},

	initialize: function() {
	    _.bindAll(this);
	    vent.on('detach', this.remove);
	    this.listenTo(users, "reset add destroy remove", this.render);
	    this.listenTo(auxUsers, "reset add destroy remove", this.render);
	    this.render();
	},
	
	render: function() {
	    this.$el.html(emailButton({emails: this.allPartyParcipitantsEmails()}));
	    return this;
	},

	allPartyParcipitantsEmails: function() {
	    return _.uniq(_.union(users.pluck('email'),auxUsers.pluck('email'))); 
	},

	sendMail: function() {
	    var toAll = _.uniq(this.allPartyParcipitantsEmails());
	    window.open("mailto:" + toAll, "_email");
	}
    });

    var createDefaultNakkiTypes = function(partyModel) {
	nakkitypes.reset();
	nakkitypes.partyId = partyModel.id;
	var defaultNakkiTypes = [
	    {type: "Ticket Sales", start: 0, end: 6},
	    {type: "Kiosk", start: 0, end: 6},
	    {type: "Cloackroom", start: 0, end: 6},
	    {type: "Bouncer", start: 0, end: 6},
	    {type: "Light Controller", start: 0, end: 6}
	];
	_.each(defaultNakkiTypes, function(el) {
	    nakkitypes.create(el);
	});
    };
 
    //TODO refactor to use maybe subviews for each models 
    var Nakki_List = bb.View.extend({
	events: {
	    'click .editor' : 'edit',
	    'click .setter' : 'saveCollection',
	    'click .creator' : 'create',
	    'click .deletor' : 'delete'
	},

	initialize: function(){
	    _.bindAll(this);
	    vent.on('changeParty createdParty', this.refresh);
	    this.collection.on('add', this.edit);
	    this.collection.on('remove', this.edit);
	    this.collection.on('reset', this.render);
	    vent.on('detach', this.remove);
	    this.render();
	},
	
	refresh: function(model) {
	    var self = this;
	    this.model = model;

	    this.collection.partyId = this.model.get('id');
	    this.collection.fetch({
		success: this.render, 
		
		error: function() {
		    self.collection.reset();
		}
	    });
	},

	render: function(){
	    this.$el.html(nakkilist({nakit:this.collection.toJSONWithClientID(), party: this.model.toJSON()}));
	    return this;
	},

	create: function(){
	    nakkitypes.add(new models.Nakkitype({type:'<define type>'}));
	},

	edit: function(){
	    this.$el.html(nakkilist_edit({nakkitypes:this.collection.toJSONWithClientID(), party: this.model.toJSON() }));
	    $('.time-picker',this.$el).timepicker({
		showMeridian: false,
		showSeconds: false,
		minuteStep: 60,
		template: 'modal',
		modalBackdrop: true,
		defaultTime: '22:00'
	    });
	    return this;
	},

	delete: function(target){
	    var self = this;
	    var removeId = target.currentTarget.attributes['value'].nodeValue;
	    var model = this.collection.get(removeId);
	    model.destroy({
		wait:true,
		
		success: function(model, options) {
		    self.notify(model, options);
		    self.render();
		},
		
		error: this.alert 
	    });
	    return false;
	},
	
	parseSlotFromTime: function(timeString, date) {
	    var time = timeString.split(":");
	    return (Number(time[0]) + 24 - date.getHours()) % 24;
	},

	parseData: function(data) {
	    data.start = this.parseSlotFromTime(data.start, this.model.get('date')); 
	    data.end = this.parseSlotFromTime(data.end, this.model.get('date'));
	    return data;
	},

	saveCollection: function() {
	    var self = this;
	    //TODO here we would reset whole collection based on input of the edit table.
	    $('#nakit form').each(function() {
		var arr = $(this).serializeArray();
		var data = _(arr).reduce(function(acc, field) {
		    acc[field.name] = field.value;
		    return acc;
		}, {});
		var model = self.collection.get(data["cid"]);
		delete data['cid'];
		model.save(self.parseData(data), {
		    success: self.notify,
		    error: self.alert
		});
	    });
	    var errors = _.reduce(this.collection.models, function(memo, model) {
		if (!!model.validationError) {
		    memo[model.cid] = model.validationError;
		};
		return memo;
	    }, {});
	    if (!_.isEmpty(errors)) {
		_.each(_.keys(errors), function(el) {
		    var message = {
			title: "Validation failed in nakkitype id=" + el,
			text: errors[el]
		    };
		    vent.trigger('alert', message);
		});
	    } else {
		this.render();
	    }
	},

	notify: function(model, options) {
	    var message = {
		title: 'Success',
		text: "Nakki " + model.get('type') + " successfully created/modified/removed."
	    };
	    vent.trigger('notify', message);
	    vent.trigger('changeParty', this.model);
	    this.render();
	},

	alert: function(model, xhr, options) {
	    var message = {
		title: "Failure in nakkitype "+ model.get('type') + " (Something went wrong in server)!",
		text: "Your assignment request failed because: " + xhr.responseText
	    };
	    vent.trigger('alert', message);
	}
    });

    var initialize = function(options) {
	var latestParty;
	var rootel = options.el;
	rootel.html(adminScreen);
	vent.off(); //hard reset!

	notificationArea.createComponent({el: $('#admin-alert-area', rootel)}, vent);

	parties.fetch( {
	    success: function() {
		//TODO remove this stuff
		if (parties.length > 0) {
			
		    latestParty = parties.last();
		    users.partyId = latestParty.get('id');
		    auxUsers.partyId = latestParty.get('id');
		    nakkitypes.partyId = latestParty.get('id');
		    
		    var _ready = _.after(3, function(){
			partySelector.createComponent({el: $('#party-selector',rootel), collection: parties, model: latestParty}, vent);
			partyEditor.createComponent({el: $('#party', rootel), collection: parties, model: latestParty}, vent);
			new Nakki_List({el: $('#nakit', rootel), model: latestParty, collection: nakkitypes});

			usersList.createConstructors({el: $('#constructors', rootel), collection: auxUsers}, vent);
			usersList.createUsers({el: $('#users', rootel), collection: users}, vent);
			usersList.createCleaners({el: $('#cleaners', rootel), collection: auxUsers}, vent);

			new EmailToAll({el: $('#email-all', rootel)});
		    });

		    auxUsers.fetch({success: _ready, error: _error});
		    users.fetch({success: _ready, error: _error});
		    nakkitypes.fetch({success: _ready, error: _error});
		} else { //TODO remove?
		    partySelector.createComponent({el: $('#party-selector',rootel), collection: parties}, vent);
		    partyEditor.createComponent({el:$('#party',rootel), collection: parties, model: new models.Party({title:'No parties yet'})}, vent);
		    new Nakki_List({el:$('#nakit',rootel), model: latestParty, collection: nakkitypes});

		    usersList.createUsers({el: $('#users', rootel), collection: users}, vent);
		    new EmailToAll({el: $('#email-all', rootel)});
		}
	    },
	    error: _error
	});
    };

    return { 
	initialize: initialize,
	detach: function() {
	    vent.trigger('detach');
	}
    };
});
