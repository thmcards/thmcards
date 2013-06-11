Cards = {
	init: function() {
		// router
		Cards.router = new Cards.Router();

		// data
		Cards.decks = new Cards.DeckCollection();

		// views
		Cards.deckLayout = new Cards.DeckLayoutView({collection: Cards.decks});
		Cards.deckFormLayout = new Cards.DeckFormLayoutView();

		// app layout
		Cards.appLayout = new Cards.AppLayout({
			el: "#app",
			detailRegion: "#details"
		});
	},
	showDecks: function(){

	},
	start: function() {
		Cards.init();

		Backbone.history.start();
	}
}

Cards.Router = Backbone.Router.extend({
	initialize: function() {

	},
	routes: {
		"" : "index",
		"decks/new": "newDeck",
		"decks/show/:filter": "decks"
	}, 
	index: function(){
		console.log("INDEX");
		this.showIndex();
	},
	newDeck: function(){
		Cards.appLayout.renderDetails(Cards.deckFormLayout);
		Cards.decks.fetch();
	},
	decks: function() {
		this.showIndex();
	},
	showIndex: function(){
		Cards.appLayout.renderDetails(Cards.deckLayout);
		Cards.decks.fetch();
	}
});