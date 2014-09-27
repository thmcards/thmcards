Cards.module('Pool', function(Pool, App) {
	Pool.CategoryItemView = Backbone.Marionette.ItemView.extend({
		tagName: "a",
		className: "list-group-item",
		template: "#pool-category-list-item",
		events: {
			"click a": "linkClicked",
			"click li": "linkClicked"
		},
		linkClicked: function(ev){
			ev.preventDefault();
			App.trigger("pool:details", this.model.get("name"));
		},
		onRender: function(){
			i18ninit();
		}
	});

	Pool.CategoryView = Backbone.Marionette.CollectionView.extend({
		tagName: "ul",
		template: "#pool-category-list",
		itemView: Pool.CategoryItemView,
		className: "list-group",
		initialize: function() {
			this.collection.fetch();
		},
		onRender: function(){
			i18ninit();
			$("#pool-category-layout-headline").text("Pool");
		}
	});
});
