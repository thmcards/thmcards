Cards.module('Pool', function(Pool, App){
	Pool.Controller = {
		showPoolLayout: function(){
			var poolLayout = new Cards.Pool.Layout();
			Cards.mainRegion.show(poolLayout);

			var categories = new Cards.Entities.CategoryCollection();
			var categoryView = new Cards.Pool.CategoryView({ collection: categories });

			poolLayout.categoryRegion.show(categoryView);
		},
		showPoolCategoryLayout: function(name){
			var poolLayout = new Cards.Pool.Layout();
			Cards.mainRegion.show(poolLayout);

			var categorySetCollection = new Cards.Entities.CategorySetCollection([], {category: name});
			var categorySetView = new Cards.Pool.CategorySetView({ collection: categorySetCollection });

			poolLayout.categoryRegion.show(categorySetView);
		},
		onRender: function(){
			i18ninit();
		}
	}
});
