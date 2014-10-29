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
		},
		sort_key: 'front',
        direction: 'down',
		comparator: function(set) {		    		    
            if(this.direction == "up"){                
                var cardside = (this.sort_key == "front") ? set.attributes.front.text : set.attributes.back.text;                               
                return String.fromCharCode.apply(String, _.map(cardside.toLowerCase().split(""), function (c) {
                    return 0xffff - c.charCodeAt();
                }));
            } else {
                var cardside = (this.sort_key == "front") ? set.attributes.front.text : set.attributes.back.text;                                                                                
                return cardside.toLowerCase();
            }
		},
		sortByField: function(side, direction){
            this.sort_key = side;
            this.direction = direction;
            this.sort();
        }
	});

	Entities.CardMemoCollection = Backbone.Collection.extend({
		model: Entities.Card,
		url: function() {
			return "/set/" + this.setId + "/memo/card";
		},
		constructor: function(models, options){
			this.setId = options.setId;
			Backbone.Collection.apply(this, arguments);
		}
	});
});