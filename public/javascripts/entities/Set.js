Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Set = Backbone.Model.extend({
		url: function() { 
			if(this.get("id")) {
				return "/set/" + this.get("id")
			} else {
				return "/set";
			}
		},
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