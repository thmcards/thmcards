Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Badge = Backbone.Model.extend({
		urlRoot: "/badge",
		idAttribute: "username"
	});

	Entities.BadgeCollection = Backbone.Collection.extend({
		model: Entities.Score,
		url: function() {
			return "/badge/" + this.username;
		},
		constructor: function(models, options){
			this.username = options.username;
			Backbone.Collection.apply(this, arguments);
		}
	});
});