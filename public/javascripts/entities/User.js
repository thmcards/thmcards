Cards.module('Entities', function(Entities, App, Backbone){

	Entities.User = Backbone.Model.extend({
		urlRoot: "/user"
	});

	Entities.UserCollection = Backbone.Collection.extend({
		model: Entities.User,
		url: function() {
			return "/user/" + this.id;
		}
	});
});