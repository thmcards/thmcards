Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Card = Backbone.Model.extend({
		urlRoot: "/card",
		validate: function (attrs) {
	        if (!attrs.front) {
	            return 'Please fill front field.';
	        }
	        if (!attrs.back) {
	            return 'Please fill back field.';
	        }
	    },
		idAttribute: "_id"
	});

	Entities.CardCollection = Backbone.Collection.extend({
		model: Entities.Set,
		url: function() {
			return "/set/" + this.setId + "/card";
		},
		constructor: function(models, options){
			this.setId = options.setId;
			Backbone.Collection.apply(this, arguments);
		}
	});
});