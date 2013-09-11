Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Rating = Backbone.Model.extend({
		urlRoot: "/rating",
		idAttribute: "setId"
	});

	Entities.RatingCollection = Backbone.Collection.extend({
		model: Entities.Rating,
		url: function() {
			return "/set/rating/" + this.setId;
		},
		constructor: function(models, options){
			this.setId = options.setId;
			Backbone.Collection.apply(this, arguments);
		}
	});
});