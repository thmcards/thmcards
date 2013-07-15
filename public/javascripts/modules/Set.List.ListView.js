Cards.module('Set.List', function(List, App) {
	List.SetItemView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#set-list-item",
		events: {
			"click a": "linkClicked"
		},
		linkClicked: function(ev){
			ev.preventDefault();
			ev.stopPropagation();
			console.log("link");
			
			App.trigger("set:details", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("_id"));
		}
	});

	List.ListView = Backbone.Marionette.CompositeView.extend({
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		template: "#set-list",
		itemView: List.SetItemView,
		itemViewContainer: "tbody",
		initialize: function() {
			this.collection.fetch();
		}
	});
});