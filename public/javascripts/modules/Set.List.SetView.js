Cards.module('Set.List', function(List, App) {
	List.SetItemView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#set-list-item",
		onRender: function(){
			i18ninit();
		}
	});

	List.ListView = Backbone.Marionette.CompositeView.extend({
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		template: "#set-list",
		itemView: List.SetItemView,
		itemViewContainer: "tbody",
		events: {
			"click a": "linkClicked"
		},
		initialize: function() {
            this.collection.on('reset', this.render, this);
            this.collection.on('sort', this.render, this);
              		  
			this.collection.fetch();
		},
		linkClicked: function(ev){
			ev.preventDefault();

			App.navigate($(ev.target).attr('href'));
			App.Set.Controller.showDetailsLayout();
		},
		onRender: function(){
			i18ninit();
		}
	});
});
