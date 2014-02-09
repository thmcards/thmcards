Cards.module('Set.List', function(List, App) {
	List.SetEmptyView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#set-list-empty",
		className: "empty-list"
	});
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
			
			App.trigger("set:details", this.model.get("_id"));
		}
	});

	List.ListView = Backbone.Marionette.CompositeView.extend({
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		template: "#set-list",
		itemView: List.SetItemView,
		emptyView: List.SetEmptyView,
		itemViewContainer: "tbody",
		events: {
			"click .btn-newSet": "newSet"
		},
		initialize: function() {
			this.collection.fetch();
		},
		newSet: function() {
			$("button.saveSet").click();
		}
	});
});