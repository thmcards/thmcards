Cards.module("Set.Learn.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-sideBar",
		className: "well well-sm sidebar-nav",
		ui: {

		},
		onRender: function(){
			i18ninit();
		}
	}),
	SideBar.ControlsView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-controls",
		className: "well well-sm sidebar-nav",
		ui: {

		},
		events: {
			"click a": "linkClicked",
			"click .learn-box": "boxChoosen"
		},
		initialize: function() {
			var that = this;

		},

		boxChoosen: function(ev) {
			if(ev.target.title) {
				App.trigger("update:cardcount");
				App.trigger("filter:box", ev.target.title);
			} else {
				App.trigger("update:cardcount");
				App.trigger("filter:box", null);
			}
		},
		linkClicked : function(ev) {
			ev.preventDefault();
		},
		onRender: function() {
			i18ninit();
			var that = this;
			App.on("filter:box", function(boxId){

				that.$el.children("button.learn-box").removeClass("btn-info");
				$("button[title='" + boxId + "']").addClass("btn-info");
			})
		},
		onShow: function() {
			App.trigger("update:cardcount");
		}
	});
});
