Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Score = Backbone.Model.extend({
		urlRoot: "/score",
		idAttribute: "username"
	});

	Entities.ScoreCollection = Backbone.Collection.extend({
		model: Entities.Score,
		url: function() {
			return "/score/" + this.username;
		}
	});
});