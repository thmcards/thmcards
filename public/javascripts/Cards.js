var Cards = new Backbone.Marionette.Application();

Cards.addRegions({
	navRegion: "#nav",
	mainRegion: "#main",
	footerRegion: "#footer"
});

Cards.Router = Backbone.Marionette.AppRouter.extend({
	appRoutes : {
		"set/list": "listSet",
		"set/new": "newSet",
		"set/details/:setName/:setId": "showSet"
	}		
});

var API = {
	listSet: function(){
		Cards.Set.Controller.showListLayout();
	},
	newSet: function(){
		//Cards.Set.Controller.showDetailsLayout();
	},
	showSet: function(name, id) {
		Cards.Set.Controller.showDetailsLayout(name, id);
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

Cards.on("initialize:after", function(){
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


