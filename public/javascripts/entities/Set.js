Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Set = Backbone.Model.extend({
		url: "/set/",
		idAttribute: "_id"
	});

	Entities.SetCollection = Backbone.Collection.extend({
		model: Entities.Set,
		url: "/set",
		comparator: function(set) {
			return set.get("name");
		}
	});
});