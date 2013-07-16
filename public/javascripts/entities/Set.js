Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Set = Backbone.Model.extend({
		url: function() { 
			console.log("THIS", this);
			return "/set/" + this.get("id") },
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