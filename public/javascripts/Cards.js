var Cards = new Backbone.Marionette.Application();

Cards.addRegions({
	navRegion: "#nav",
	mainRegion: "#main",
	footerRegion: "#footer"
});

Cards.Router = Backbone.Marionette.AppRouter.extend({
	appRoutes : {
		"pool": "showPool",
		"pool/category/:name": "showPoolCategory",
		"set/list": "listSet",
		"set/rating/:setId": "showSetRating",
		"set/details/:setId": "showSet",
		"set/detailslist/:setId": "showSetList",
		"set/details/:setId/new": "newCard",
		"set/details/:setId/edit/:cardId": "editCard",
		"set/learn/:setId": "learnSet",
		"set/memo/:setId": "startMemo",
		"profile/:id": "showProfile",
		"game/meteor/:id": "playMeteor"
	}		
});

var API = {
	listSet: function(){
		Cards.Set.Controller.showListLayout();
	},
	newCard: function(id){
		Cards.Set.Controller.showDetailsNewCardLayout(id);
	},
	editCard: function(id, cardId){
		Cards.Set.Controller.showDetailsEditCardLayout(cardId);
	},
	showSet: function(id) {
		Cards.Set.Controller.showDetailsLayout(id);
	},
	showSetList: function(id) {
		Cards.Set.Controller.showDetailsListLayout(id);
	},
	showSetRating: function(id) {
		Cards.Set.Controller.showRatingLayout(id);
	},
	learnSet: function(id) {
		Cards.Set.Controller.showLearnLayout(id);
	},
	startMemo: function(id) {
		Cards.Set.Controller.showMemoLayout(id);
	},
	showPool: function() {
		Cards.Pool.Controller.showPoolLayout();
	},
	showPoolCategory: function(name) {
		Cards.Pool.Controller.showPoolCategoryLayout(name);
	},
	showProfile: function(username) {
		Cards.Profile.Controller.showLayout(username);
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
	
	$.get("/whoami", function( usr ) {
		$("#usr-name").text(usr.username);
		$("#usr-profile").attr("href", "/#profile/"+usr.username);
	});


	if(Backbone.history) {
		Backbone.history.start();

		if(this.getCurrentRoute() === "") {
			Cards.trigger("set:list");
		}
	}

	var engine = {
	  compile: function(template) {
	    var compiled = _.template(template);

	    return {
	      render: function(context) { return compiled(context); }
	  	}
	} };

	$("#input-search").typeahead([{
		name: 'category',
		remote:  '/typeahead/set/category?q=%QUERY',
		prefetch: '/typeahead/set/category',
		footer: "<hr />",
		template: [                                           
		  '<p class="typeahead-name"><%= value %> <span>Kategorie</span></p>',                                      
		  '<p class="typeahead-description"><%= count %> <% if(count > 1) { %> Kartensätze <% } else { %>Kartensatz<% } %></p>'                         
		].join(''),                                                                 
		engine: engine 
	},
	{
		name: 'sets',
		remote: '/typeahead/set/visibility?q=%QUERY',
		prefetch: '/typeahead/set/visibility',
		footer: "<hr />",
		template: [                                                
		  '<p class="typeahead-name"><%= value %> <span>Kartensatz</span></p>',                                      
		  '<p class="typeahead-description"><%= description %></p>'                         
		].join(''),                                                                 
		engine: engine 
	}]);

	$("#input-search").on("typeahead:selected", function(ev, datum, name) {
		if(name == "category") Cards.trigger("pool:details", datum.value);
		if(name == "sets") Cards.trigger("set:details", datum.id);

		$("#input-search").blur();
	})
	$("#input-search").on("blur", function(){
		$(this).val("");
		$(this).prev().val("");
	})

	// CSRF Hook
	$(document).ajaxSend(function(event, xhr, settings) {

	  function sameOrigin(url) {
	    var host = document.location.host; // host + port
	    var protocol = document.location.protocol;
	    var sr_origin = '//' + host;
	    var origin = protocol + sr_origin;
	    return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
	           (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
	           !(/^(\/\/|http:|https:).*/.test(url));
	  }

	  function safeMethod(method) {
	    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
	  }

	  if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
	    xhr.setRequestHeader("X-CSRFToken", $.cookie('csrf.token'));
	  }
	});

	console.log("THMcards has started!");
});


/* ROUTING EVENTS */
Cards.on("pool", function(){
	Cards.navigate("pool");
	API.showPool();
})

Cards.on("pool:details", function(name){
	Cards.navigate("pool/category/"+name);
	API.showPoolCategory(name);
})

Cards.on("set:list", function(){
	Cards.navigate("set/list");
	API.listSet();
});

Cards.on("set:rating", function(id){
	Cards.navigate("set/rating/"+id);
	API.showSetRating(id);
})

Cards.on("set:details", function(id){
	Cards.navigate("set/details/"+id);
	API.showSet(id);
})

Cards.on("set:detailslist", function(id){
	Cards.navigate("set/detailslist/"+id);
	API.showSetList(id);
})

Cards.on("set:details:new", function(id){
	Cards.navigate("set/details/"+id+"/new");
	API.newCard(id);
})

Cards.on("set:details:edit", function(id, cardId){
	Cards.navigate("set/details/"+id+"/edit/"+cardId);
	API.editCard(id, cardId);
})

Cards.on("set:learn", function(id){
	Cards.navigate("set/learn/"+id);
	API.learnSet(id);
})

Cards.on("set:memo", function(id){
	Cards.navigate("set/memo/"+id);
	API.startMemo(id);
})

Cards.on("profile", function(username){
	Cards.navigate("profile/"+username);
	API.showProfile(username);
})

Cards.on("play:meteor", function(id){
	Cards.navigate("game/meteor/"+id);
	API.playMeteor(id);
})

function FilteredCollection(collection, options){
    var filtered = new collection.constructor(collection.models, options);
        
    filtered.filter = function(criteria){
        var items;
        if (criteria){
            items = _.filter(collection.models, function(model) {
            	var persCard = model.get("persCard");
            	var pcard;
            	if(_.isArray(persCard)) {
            		pcard = _.first(model.get("persCard"));	
            	} else {
            		pcard = model.get("persCard");
            	}

				if (pcard) {
					console.log(pcard.value.box, criteria);
           			return pcard.value.box == criteria;
           		} else {
           			console.log("no card");
           		}
           		if (_.isUndefined(pcard) && criteria == 1){           			
           			return true;
           		} 
           		else return false;

			});
        } else {
            items = collection.models;
        }
        filtered.reset(items);
    };
    collection.on("change", function(model){
    	console.log("change", collection.models);
        filtered.reset(collection.models);
    });
    collection.on("reset", function(){
    	console.log("reset");
        filtered.reset(collection.models);
    });          
        
    return filtered;
}