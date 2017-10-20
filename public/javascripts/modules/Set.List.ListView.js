Cards.module('Set.List', function(List, App) {
	List.SetEmptyView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#set-list-empty",
		className: "empty-list",
		onRender: function(){
			i18ninit();
		}
	});
	List.SetLearnedEmptyView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#set-list-learned-empty",
		className: "empty-list",
		onRender: function(){
			i18ninit();
		}
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
			var that = this;
									
            this.collection.bind("reset", function(col, opt) {
				if(!_.isUndefined(opt) && _.has(opt, "learned")) {
					that.emptyView = List.SetLearnedEmptyView;
				} else {
					that.emptyView = List.SetEmptyView;
				}
			});
               		 
			this.collection.fetch();
            this.collection.on('sort', this.render, this);   
		},
		newSet: function() {
			$("button.saveSet").click();
		}
	});
});
