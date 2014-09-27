Cards.module('Pool', function(Pool, App) {
	Pool.CategorySetItemView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#pool-category-set-list-item",
		events: {
			"click a.pool-category-set-details-link": "setNameClicked",
			"click a.pool-category-set-owner-link": "setOwnerClicked",
		},
		setNameClicked: function(ev) {
			ev.preventDefault();
			App.trigger("set:details", this.model.get("_id"));
		},
		setOwnerClicked: function(ev) {
			ev.preventDefault();
			App.trigger("profile", this.model.get("owner"));
		},
		onRender: function(){
			i18ninit();
		}
	});

	Pool.CategorySetView = Backbone.Marionette.CompositeView.extend({
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		template: "#pool-category-set-list",
		itemView: Pool.CategorySetItemView,
		itemViewContainer: "tbody",
		initialize: function() {		  
			this.collection.fetch();
			this.collection.on('sort', this.render, this);
		},
		onRender: function(){
			i18ninit();
			$("#pool-category-layout-headline").text(this.collection.category);
		}
	});
});
