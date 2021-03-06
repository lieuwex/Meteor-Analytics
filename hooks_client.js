var tail_message = new Mongo.Collection("__tail_message"),
	tail_setup = true,
	event_triggers = [],
	booted = new Date().getTime();

Deps.autorun(function() {
	var initsetup = tail_message.findOne('0');

	if(initsetup && tail_setup) Meteor.startup(function() { 
		$('body').append(initsetup.html) && (tail_setup = false);
	})
	else if(!tail_setup && !initsetup) $('#__tail_setup_begin, #__tail_setup_finish').toggle() && Meteor.call("_Tevent", {type:'eventsync', sets: event_triggers});
});

var getUUID = function() {
	if(window.localStorage) {
		var token = window.localStorage.getItem("tailuiid");
		if(!token) {
			token = Random.id();
			window.localStorage.setItem("tailuiid", token);
		}else return token
	}else{
		//Do something with cookies?
	}
}

Meteor.subscribe("_aurora", { referrer: document.referrer, secure: (window.location.protocol=='https:'), preview: (window.navigator && window.navigator.loadPurpose), language: (window.navigator && window.navigator.language), uid: getUUID() }, function() {
	Meteor.call("_Tevent", {type: 'boot', connection: Meteor.connection._lastSessionId, time: new Date().getTime() - booted});
});


Meteor.startup(function() {
	var eventHook = function(template, selector, eventType) {
		var events = {};
		events[selector] = function(e,tmpl) { 
			if(eventType && ["keypress", "keyup", "mouseout", "mouseover", "keydown"].indexOf(eventType.toLowerCase()) >=0) return;
			if(selector.toLowerCase().substr(0,8) == "keypress") return;	//Lets ignore these they could be dangerous
			Meteor.call("_Tevent", {type:'event', template: template, selector: selector, formdata: $(tmpl.findAll('input[type=text],input[type=number],input[type=email],input[type=check],input[type=search],textarea,select')).serializeArray(), connection: Meteor.connection._lastSessionId}); 
		};
		if(typeof Template[template].events == "function") Template[template].events(events);
		else console.log('WARNING', 'Depreciated style Meteor events are not supported such as the ones on ' + template);
	}

	for(var key in Template) {
		var tmpl = Template[key], events = tmpl.__eventMaps || tmpl._events || (tmpl && tmpl._tmpl_data && tmpl._tmpl_data.events);
		if(!events) continue;

		/* Blaze Refactor*/
		if(Template[key].__eventMaps){
  			var i = events.length;
  			while(i--) {
  				for(var id in events[i]) {
	 				event_triggers.push({template: key, name: id});
	 				eventHook(key, id, id.split(" ")[0]);
	  			}
  			}
  		}
	}

	//Page Changes 
	if(typeof(Meteor.Router) != "undefined")
		Deps.autorun(function() {
			Meteor.Router.page();
			if(Meteor.status().connected)
				Meteor.call("_Tevent", {type: 'page', title: document.title, path: window.location.pathname, params: {},  connection: Meteor.connection._lastSessionId});	
		});
	else if(typeof(Router) != "undefined")
		Router.onAfterAction(function() {
			Meteor.call("_Tevent", {type: 'page', title: document.title, path: this.url || this.path, params: this.params,  connection: Meteor.connection._lastSessionId});
		});
	else if(typeof Backbone != "undefined") {
		var originalNavigate = Backbone.history.navigate;
		Backbone.history.navigate = function(fragment, options){
		    originalNavigate.apply(this, arguments);
		    Meteor.call("_Tevent", {type: 'page', title: document.title, path: '/' + Backbone.history.fragment, params: {},  connection: Meteor.connection._lastSessionId});
		}
	}

	var winstate = false;
	window.addEventListener("focus", function(event) { 
		if(winstate) return; 
		winstate = true; 
		Meteor.call("_Tevent", {type:'event', template: "", selector: "Window activated", connection: Meteor.connection._lastSessionId});  
	}, false);
	
	window.addEventListener("blur", function(event) { 
		winstate=false; 
		Meteor.call("_Tevent", {type:'event', template: "", selector: "Window in background", connection: Meteor.connection._lastSessionId}); 
	}, false);

	window.addEventListener("error", function(event) {
		var stack = event && event.error && event.error.stack && event.error.stack.toString();
		if(stack && event.lineno) 
			Meteor.call("_Tevent", {type:'event', template:"", error: { stack: stack, line: event.lineno, filename: event.filename }, selector: "Javascript Error", connection: Meteor.connection._lastSessionId}); 

	});
});