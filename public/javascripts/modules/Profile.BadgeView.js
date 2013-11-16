Cards.module('Profile', function(Profile, App) {
	Profile.BadgeItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-badge-item",
		tagName: "tr",
		events: {
			"click a": "linkClicked"
		},
		linkClicked: function(ev){
			ev.preventDefault();
		
		}
	});

	Profile.BadgeView = Backbone.Marionette.CompositeView.extend({
		tagName: "div",
		className: "panel panel-default",
		template: "#profile-badge-list",
		itemView: Profile.BadgeItemView,
		itemViewContainer: "tbody",
		events: {
			"click a": "linkClicked"
		},
		initialize: function() {
			this.collection.fetch();
		},
		linkClicked: function(ev){
			ev.preventDefault();
			
			
		}
	});
});