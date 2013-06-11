Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Card = Backbone.Model.extend({
		urlRoot: function() {
			return "/set/" + this.id + "/card";
		}
	});

	Entities.CardCollection = Backbone.Collection.extend({
		model: Entities.Card,
		url: function() {
			return "/set/" + this.setId + "/card";
		},
		constructor: function(models, options){
			this.setId = options.setId;
			Backbone.Collection.apply(this, arguments);
		}
	});
});