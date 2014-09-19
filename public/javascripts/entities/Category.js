Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Category = Backbone.Model.extend({ });

	Entities.CategoryCollection = Backbone.Collection.extend({
		model: Entities.Category,
		url: "/set/category",
		comparator: function(set) {		
			return set.get("name");
		}
	});

	Entities.CategorySetCollection = Backbone.Collection.extend({
		model: Entities.Category,
		url: function() {
			return "/set/category/" + this.category;
		},
		constructor: function(models, options){
			this.category = options.category;
			Backbone.Collection.apply(this, arguments);
		}
	});
});