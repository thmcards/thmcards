Cards.Deck = Backbone.Model.extend({
	url: function() {
		return "/decks/" + this.id;
	},
	validate: function(attributes) {
		if(_.isEmpty(attributes.name)) {
			return "Need a name!";
		}
	}
});

Cards.DeckCollection = Backbone.Collection.extend({
	fetch: function(options) {
	    options = options ? _.clone(options) : { };

	    var success     = options.success;
	    options.success = function(collection, response, options) {
	        collection.trigger('fetched_and_notified', collection);
	        if(success)
	            success(collection, response, options);
	    };
	    Backbone.Collection.prototype.fetch.call(this, options);
	},
	model: Cards.Deck,
	url: "/decks"
});

Cards.DeckView = Cards.View.extend({
	tagName: "tr",
	template: "#deck-list-template",
	events: {
		"click a": "sayHello",
		"click button": "sayHello"
	},
	sayHello: function(ev){
		ev.preventDefault();
		alert("hello");
	}
});

Cards.DeckListView = Cards.ListView.extend({
	initialize: function(){
		// stores a copy of the collection after the first fetch
		this.originalCollection = new Backbone.Collection();

		this.collection.bind("reset", this.render, this);
		this.collection.bind("add", this.render, this);
		this.collection.bind("remove", this.render, this);

		// cant use this inside of the callback - different scope
		var that = this;

		// collection triggers "fetched_notified" event after fetching results
		// fill then the originalCollection with the models
		this.collection.on('fetched_and_notified', function(){
			that.originalCollection.reset(this.collection.models, {silent: true});
			
			var frag = Backbone.history.fragment;
			if(frag !== '') {
				var filter = frag.substring(frag.lastIndexOf("/")+1);
				that.setFilter(filter);

			}
		}, this);

		// if the route changes, apply the filter /#decks/[filter]
		Cards.router.on("route:decks", function(filter){
			that.setFilter(filter);
		});
		this.on("change:filterType", this.filterByType, this);
	},
	tagName: "tbody",
	ItemView: Cards.DeckView,
	setFilter: function(filter) {
		this.filterType = filter;
		this.trigger("change:filterType");
	},
	filterByType: function() {
		if(this.filterType === "all"){
			this.collection.reset(this.originalCollection.models);
		} else {
			// reset event not fired!
			this.collection.reset(this.originalCollection.models, {silent: true});

			var filterType = this.filterType,
				filtered = _.filter(this.collection.models, function(item){
					return item.get("type") === filterType;
				});

				this.collection.reset(filtered);
		}
	}
});

Cards.DeckNavigationView = Cards.View.extend({
	template: "#deck-nav-template",
	events: {
		"click a": "bla"
	},
	bla: function(ev) {
		ev.preventDefault();

		var liElem = $(ev.currentTarget).parent();
		liElem.siblings().removeClass("active");
		if(!liElem.hasClass("active")) liElem.addClass("active");

		var linkName = "decks" + $(ev.currentTarget).attr("href");
		Cards.router.navigate(linkName);
	}
});

Cards.CourseView = Cards.View.extend({
	template: "#course-list-template",
	events: {
		"click": "goToCourse"
	},
	goToCourse: function(ev) {
		ev.preventDefault();
		Cards.router.navigate("", true);
	}
});

Cards.DeckListLayoutView = Cards.Layout.extend({
	template: "#deck-list-table-template",
	regions: {
		deckList: "#tabletable",
		deckNavigation: "#deck-navigation"
	},
	layoutReady: function(){
		var deckListView = new Cards.DeckListView({collection: this.collection});
		var deckNavView = new Cards.DeckNavigationView();

		this.deckList.append(deckListView.render().el);
		this.deckNavigation.append(deckNavView.render().el);
	}
});

Cards.DeckLayoutView = Cards.Layout.extend({
	template: "#deck-details-template",
	regions: {
		deckList: "#deck-list",
		courseList: "#course-list"
	},
	layoutReady: function() {
		var deckListView = new Cards.DeckListLayoutView({collection: this.collection});
		var courseListView = new Cards.CourseView();

		this.deckList.append(deckListView.render().el);
		this.courseList.append(courseListView.render().el);
	}
});

Cards.DeckFormView = Cards.View.extend({
	template: "#deck-form-template"
});

Cards.DeckFormLayoutView = Cards.Layout.extend({
	template: "#deck-form-layout-template",
	regions: {
		deckForm: "#new-deck-form",
		courseList: "#new-deck-course-list"
	},
	layoutReady: function() {
		var deckFormView = new Cards.DeckFormView();
		var courseListView = new Cards.CourseView();

		this.deckForm.append(deckFormView.render().el);
		this.courseList.append(courseListView.render().el);
	}
});