Cards.module('Pool', function(Pool, App){
	Pool.Controller = {
		showPoolLayout: function(){		
			var poolLayout = new Cards.Pool.Layout();
			Cards.mainRegion.show(poolLayout);

			var categories = new Cards.Entities.CategoryCollection();
			var categoryView = new Cards.Pool.CategoryView({ collection: categories });

			poolLayout.categoryRegion.show(categoryView);
		},
		showPoolCategoryLayout: function(name, fieldname, direction){            
        		
			var poolLayout = new Cards.Pool.Layout();
			Cards.mainRegion.show(poolLayout);
			
			if(!fieldname){
                fieldname = "name";
            }
            if(!direction){
                direction = "down";
            }

			var categorySetCollection = new Cards.Entities.CategorySetCollection([], {category: name});			
			categorySetCollection.sortByField(fieldname, direction);
			
			var categorySetView = new Cards.Pool.CategorySetView({ collection: categorySetCollection });
			poolLayout.categoryRegion.show(categorySetView);			
		},
		sortPoolCategoryLayout: function(fieldname, direction){                         
            this.showPoolCategoryLayout(window.location.hash.split("/").pop(), fieldname, direction);
        },
		onRender: function(){
			i18ninit();
		}
	}
});
