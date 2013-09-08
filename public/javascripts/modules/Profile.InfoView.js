Cards.module('Profile', function(Profile, App) {
	Profile.InfoItemView = Backbone.Marionette.ItemView.extend({
		template: "#profile-info-item",
		className: "panel panel-default",
		events: {
			"click a": "linkClicked",
			"blur #inputNameProfile": "changeName"
		},
		changeName: function(ev) {
			var name = $("#inputNameProfile").val();

			if(name !== '') {
				var model = this.model.save({
					name: name
				}, {
					success: function(){
						$("#inputNameProfile").parent().parent().addClass("has-success");
						setTimeout(function(){
							$("#inputNameProfile").parent().parent().removeClass("has-success");
						}, 2000)
					},
					error: function(){
						$("#inputNameProfile").parent().parent().addClass("has-error");
					}
				});
			}
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
		}
	});
});