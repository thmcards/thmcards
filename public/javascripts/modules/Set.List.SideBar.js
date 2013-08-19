Cards.module("Set.List.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-list-sideBar",
		className: "well sidebar-nav",
		ui: {
			btnAdd: "a.saveSet", 
			inputSetName: "input[type=text]",
			modalView: "#newSetModal",
			modalBtnSave: "#newSetModal button.btn-primary",
			modalInputName: "#newSetName",
			modalInputDescription: "#newSetDescription",
			modalBtnVisibility: "#newSetModal .btn-group > button.active"
		},
		events: {
			"click a.saveSet": "showSetModal",
			"click #newSetModal button.btn-primary": "saveSet",
			"keyup input[type=text]": "onKeypress"
		},
		onKeypress: function(ev) {
			var ENTER_KEY = 13;

			if(ev.which === ENTER_KEY) {
				this.showSetModal();
			}
		},
		showSetModal: function() {
			var that = this;

			var newSetName = this.ui.inputSetName.val().trim();
			this.ui.inputSetName.val('');
			var newSet = new Cards.Entities.Set({ name: newSetName, created: new Date().getTime(), count: Math.round(Math.random()*50) });
			console.log(newSet);

			
			this.ui.modalView.on('show', function () {
    			that.ui.modalInputName.val(newSetName);
			});
			this.ui.modalView.on('shown', function () {
				if(newSetName == "") {
					that.ui.modalInputName.focus();
				} else {
					that.ui.modalInputDescription.focus();
				}
			});
			this.ui.modalView.on('hidden', function() {
				that.ui.modalBtnSave.button('reset');
				that.ui.modalInputName.val('');
				that.ui.modalInputDescription.val('');
			})
			this.ui.modalView.modal('show');
		},
		saveSet: function(ev) {
			var that = this;

			this.ui.modalBtnSave.button('loading');

			var name = this.ui.modalInputName.val();
			var description = this.ui.modalInputDescription.val();
			var visibility = this.ui.modalBtnVisibility.val();

			var newSet = new Cards.Entities.Set({ 
								name: name, 
								description: description,
								visibility: visibility,
								cardCnt: 0
							 });

			this.collection.create(newSet, {
			    wait : true,    // waits for server to respond with 200 before adding newly created model to collection

			    success : function(resp){
			        that.ui.modalView.modal('hide');
			    },
			    error : function(err) {
			    	that.ui.modalBtnSave.button('reset');
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});


		},
		initialize: function(options) {
			this.collection = options.collection;
		}
	});
});