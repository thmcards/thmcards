Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Card = Backbone.Model.extend({
		urlRoot: "/card",
		validate: function (attrs) {
			var errors = [];
	        if (!attrs.front.text) {
	            errors.push({name: 'fronttext', message: 'Bitte Vorderseite ausfüllen.'});
	        }
	        if (!attrs.back.text) {
	            errors.push({name: 'backtext', message: 'Bitte Rückseite ausfüllen.'});
	        }
	        return errors.length > 0 ? errors : false;
	    },
		idAttribute: "_id"
	});

	Entities.CardCollection = Backbone.Collection.extend({
		model: Entities.Card,
		url: function() {
			return "/set/" + this.setId + "/card";
		},
		constructor: function(models, options){
			this.setId = options.setId;
			Backbone.Collection.apply(this, arguments);
		}
	});
});