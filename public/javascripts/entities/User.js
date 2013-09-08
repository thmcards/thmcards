Cards.module('Entities', function(Entities, App, Backbone){

	Entities.User = Backbone.Model.extend({
		urlRoot: "/user",
		idAttribute: "username"
	});

	Entities.UserCollection = Backbone.Collection.extend({
		model: Entities.User,
		url: function() {
			return "/user/" + this.username;
		}
	});
});