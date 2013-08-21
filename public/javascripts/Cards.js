var Cards = new Backbone.Marionette.Application();

Cards.addRegions({
	navRegion: "#nav",
	mainRegion: "#main",
	footerRegion: "#footer"
});

Cards.Router = Backbone.Marionette.AppRouter.extend({
	appRoutes : {
		"set/list": "listSet",
		"set/details/:setName/:setId": "showSet",
		"set/details/:setName/:setId/new": "newCard",
		"set/learn/:setName/:setId": "learnSet",
		"profile/:id": "showProfile",
		"play/meteor/:id": "playMeteor"
	}		
});

var API = {
	listSet: function(){
		Cards.Set.Controller.showListLayout();
	},
	newCard: function(name, id){
		Cards.Set.Controller.showDetailsNewCardLayout(name, id);
	},
	showSet: function(name, id) {
		Cards.Set.Controller.showDetailsLayout(name, id);
	},
	learnSet: function(name, id) {
		Cards.Set.Controller.showLearnLayout(name, id);
	},
	showProfile: function(id) {
		Cards.Profile.Controller.showLayout(id);
	},
	playMeteor: function(id) {
		Cards.Game.Controller.showMeteorLayout(id);
	}
};

Cards.navigate = function(route, options) {
	if(typeof(options)==='undefined') options = {};
	
	Backbone.history.navigate(route, options);
};

Cards.getCurrentRoute = function(){
	return Backbone.history.fragment;
};

Cards.addInitializer(function(){
	new Cards.Router({ controller: API });
});

Cards.on("initialize:after", function() {
	$.ajaxSetup({
	    statusCode: {
	        401: function(){
	            window.location.replace('/login');
	        }
	    }
	});
	
	$.cookie.json = true;
	var usr = $.cookie('usr');
	$("#usr-profile").text(usr.username);
	$("#usr-profile").attr("href", "/#profile/"+usr.id);

	if(Backbone.history) {
		Backbone.history.start();

		if(this.getCurrentRoute() === "") {
			Cards.trigger("set:list");
		}
	}

	console.log("THMcards has started!");
});

/* ROUTING EVENTS */
Cards.on("set:list", function(){
	Cards.navigate("set/list");
	API.listSet();
});

Cards.on("set:details", function(name, id){
	Cards.navigate("set/details/"+name+"/"+id);
	API.showSet(name, id);
})

Cards.on("set:details:new", function(name, id){
	Cards.navigate("set/details/"+name+"/"+id+"/new");
	API.newCard(name, id);
})

Cards.on("set:learn", function(name, id){
	Cards.navigate("set/learn/"+name+"/"+id);
	API.learnSet(name, id);
})

Cards.on("profile", function(id){
	Cards.navigate("profile/"+id);
	API.showProfile(id);
})

Cards.on("play:meteor", function(id){
	Cards.navigate("play/meteor/"+id);
	API.playMeteor(id);
})

