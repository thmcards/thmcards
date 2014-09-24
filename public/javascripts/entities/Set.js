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
        },
        sort_key: 'name',
        direction: 'down',
        comparator: function(set) {
            if(this.direction == "up"){                
                return String.fromCharCode.apply(String, _.map(set.get(this.sort_key).toLowerCase().split(""), function (c) {
                    return 0xffff - c.charCodeAt();
                }));    
            } else {                
                return set.get(this.sort_key).toLowerCase();    
            }                         	
		},
		sortByField: function(fieldname, direction){
            this.sort_key = fieldname;
            this.direction = direction;
            this.sort();
        }
	});

	Entities.SetLearnedCollection = Backbone.Collection.extend({
		model: Entities.Set,
		url: "/set/learned"
	});
});