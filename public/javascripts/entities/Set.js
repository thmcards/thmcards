Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Set = Backbone.Model.extend({
		url: function() { 
			if(this.get("id")) {
				return "/set/" + this.get("id")
			} else {
				return "/set";
			}
		},
		validate: function (attrs) {
			console.log(attrs);
			var errors = [];
	        if (!attrs.name) {
	            errors.push({name: 'name', message: 'Bitte Namen angeben.'});
	        }
	        if (!attrs.description) {
	            errors.push({name: 'description', message: 'Bitte Beschreibung angeben.'});
	        }
	        if (!attrs.category) {
	            errors.push({name: 'category', message: 'Bitte Kategorie angeben.'});
	        }
	        return errors.length > 0 ? errors : false;
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

	Entities.SetCollection = Backbone.Collection.extend({
		model: Entities.Set,
		url: "/set"
	});

	Entities.SetLearnedCollection = Backbone.Collection.extend({
		model: Entities.Set,
		url: "/set/learned"
	});
});