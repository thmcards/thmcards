Cards.module('Entities', function(Entities, App, Backbone){

	Entities.Personalcard = Backbone.Model.extend({
		urlRoot: "/personalcard",
		validate: function (attrs) {
			//...
	    },
	    idAttribute: "_id"
	});

	Entities.PersonalCollection = Backbone.Collection.extend({
		model: Entities.Personalcard,
		url: function() {
			return "/set/" + this.setId + "/personalcard";
		},
		constructor: function(models, options){
			this.setId = options.setId;
			Backbone.Collection.apply(this, arguments);
		}
	});
});