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
});