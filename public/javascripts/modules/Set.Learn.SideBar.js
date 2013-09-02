Cards.module("Set.Learn.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-sideBar",
		className: "well well-sm sidebar-nav",
		ui: {

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
			console.log(this.collection);
		},
		boxChoosen: function(ev) {
			if(ev.target.id) {
				App.trigger("filter:box", ev.target.id);
			} else {
				App.trigger("filter:box", null);
			}
		},
		linkClicked : function(ev) {
			ev.preventDefault();

			console.log(this.model);
		},
		onRender: function() {
			var that = this;
			App.on("filter:box", function(boxId){
				
				that.$el.children("button.learn-box").removeClass("btn-info");
				$("#"+boxId).addClass("btn-info");
			})
		}
	});
});