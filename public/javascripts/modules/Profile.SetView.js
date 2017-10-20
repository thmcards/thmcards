Cards.module('Profile', function(Profile, App) {
	Profile.SetItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-set-item",
		tagName: "tr",
		events: {
			"click a": "setNameClicked"
		},
		setNameClicked: function(ev) {
			ev.preventDefault();
			App.trigger("set:details", this.model.get("_id"));
		},
		onRender: function(){
			i18ninit();
		}
	});

	Profile.SetView = Backbone.Marionette.CompositeView.extend({
		tagName: "div",
		className: "panel panel-default",
		template: "#profile-set-list",
		itemView: Profile.SetItemView,
		itemViewContainer: "tbody",
		events: {

		},
		onRender: function(){
			i18ninit();
		}
	});
});
