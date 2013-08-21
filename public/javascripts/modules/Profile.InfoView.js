Cards.module('Profile.Info', function(Info, App) {
	Info.InfoItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-info-item",
		className: "well well-small",
		events: {
			"click a": "linkClicked"
		},
		linkClicked: function(ev){
			ev.preventDefault();
			ev.stopPropagation();
			console.log("link");
			
			$.get('/badge', function(data) {
				console.log(data);
			  	
				OpenBadges.issue(data, function(errors, successes) { 
					console.log(errors, successes);
			 	});
			});


			

			//App.trigger("set:details", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("_id"));
		}
	});
/*
	List.ListView = Backbone.Marionette.CompositeView.extend({
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		template: "#set-list",
		itemView: List.SetItemView,
		itemViewContainer: "tbody",
		initialize: function() {
			this.collection.fetch();
		}
	});*/
});