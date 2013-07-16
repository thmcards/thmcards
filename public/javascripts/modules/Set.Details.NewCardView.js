Cards.module('Set.Details', function(Details, App) {
	Details.NewCardView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-newcard",
		events: {
			"click .btn-success": "saveCard"
		},
		saveCard: function(ev) {
			console.log("asd");

			var setId = this.model.get('id');
			var setName = this.model.get('name');

			var card = new Cards.Entities.Card({
				front: $("#front-textarea").val(),
				back: $("#back-textarea").val(),
				setId: setId
			});


			card.save({}, {
				success: function(model, response) {
					alert("karte angelegt");
					Cards.trigger("set:details", setName.replace(/[^a-zA-Z0-9-_]/g, '_'), setId);
				},
				error: function(model, error) {
					alert("something went wrong");
				}
			});
		},
		onShow: function() {
			var editorConfig = {
				"font-styles": false,
				"color": false,
				"lists": false
			}

			$("#front-textarea").wysihtml5(editorConfig);
			$("#back-textarea").wysihtml5(editorConfig);
		}
	});
});