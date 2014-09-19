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
        initialize: function() {                        
            //console.log("initialize");                    
            //this._orderByDescription = this.comparator;                                   
        },
        comparator: function(set) {                        
            //console.log("comparator");
            			
			//return set.get("name");
            return set.get("description");            	
		},
		orderByCategory: function() {
		    this.comparator = this._orderByCategory;
		    this.sort();            
        },
        _orderByCategory: function(set) {
            return set.get("category");
        },
        orderByDescription: function() {
            this.comparator = this._orderByDescription;
            this.sort();                        
        },
        _orderByDescription: function(set) {          
            return set.get("description");            
        }
	});

	Entities.SetLearnedCollection = Backbone.Collection.extend({
		model: Entities.Set,
		url: "/set/learned"
	});
});