class thmcards {

  file { "/home/vagrant/thmcards-start.sh":
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/thmcards-start.sh.erb"),
    mode => "744"
  }

  file { "/home/vagrant/init.sh":
    ensure => present,
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/init.sh.erb"),
    mode => "744"
  }

  exec { "init thm-cards":
    command => "/home/vagrant/init.sh",
    require => File['/home/vagrant/init.sh']
  }

  class { "motd":
    template => "thmcards/motd.erb"
  }

  class { "jenkins":
      config_hash => {
        "HTTP_PORT" => { "value" => "9090" },
        "AJP_PORT" => { "value" => "9009" }
      },
      plugin_hash => {
        "build-pipeline-plugin"=> {},
        "jquery"=> {},
        "parameterized-trigger"=> {},
        "subversion"=> {},
        "conditional-buildstep"=> {},
        "promoted-builds"=> {},
        "token-macro"=> {},
        "run-condition"=> {},
        "ssh-credentials"=> {},
        "credentials"=> {},
        "scm-api"=> {},
        "mapdb-api"=> {},
        "maven-plugin"=> {}
      }
    }

}
