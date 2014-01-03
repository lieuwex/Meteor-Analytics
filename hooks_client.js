var tail_message = new Meteor.Collection("__tail_message"),
	tail_setup = true,
	event_triggers = [],
	booted = new Date().getTime();

Deps.autorun(function() {
	var initsetup = tail_message.findOne('0');

	if(initsetup && tail_setup) $('body').append(initsetup.html) && (tail_setup = false);
	else if(!tail_setup && !initsetup) $('#__tail_setup_begin, #__tail_setup_finish').toggle() && Meteor.call("_Tevent", {type:'eventsync', sets: event_triggers});
});


Meteor.startup(function() {

	var eventHook = function(template, selector) {
		var events = {};
		events[selector] = function(e,tmpl) { 
			Meteor.call("_Tevent", {type:'event', template: template, selector: selector, formdata: $(template.findAll('input[type=text],input[type=number],input[type=email],input[type=check],input[type=search],textarea,select')).serializeArray(), connection: Meteor.connection._lastSessionId}); 
		};
		if(typeof Template[template].events == "function") Template[template].events(events);
		else console.log('WARNING', 'Depreciated style Meteor events are not supported such as the ones on ' + template);
	}

	for(var key in Template) {
		var tmpl = Template[key], events = (tmpl && tmpl._tmpl_data && tmpl._tmpl_data.events) || tmpl.events;
		if(!events) continue;
		if(!Template[key]._tmpl_data.events) Template[key]._tmpl_data.events = {};
		for(var eventKey in events) {
			event_triggers.push({template: key, name: eventKey});
			if(!Template[key]._tmpl_data.events[eventKey]) Template[key]._tmpl_data.events[eventKey] = [];
			eventHook(key, eventKey);
		}
	}

	//Page Changes 
	if(typeof(Meteor.Router) != "undefined")
		console.log("Meteor Router page hooks are not supported");
	else if(typeof(Router) != "undefined")
		Router.addHook("after", function() {
			Meteor.call("_Tevent", {type: 'page', title: document.title, path: this.path, params: this.params,  connection: Meteor.connection._lastSessionId});
		});

	Meteor.subscribe("_aurora", { referrer: document.referrer, secure: (window.location.protocol=='https:')}, function() {
		Meteor.call("_Tevent", {type: 'boot', connection: Meteor.connection._lastSessionId, time: new Date().getTime() - booted});
	});
});
