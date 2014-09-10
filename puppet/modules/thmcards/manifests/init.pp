class thmcards {

  file { "/home/vagrant/thmcards-start.sh":
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/thmcards-start.sh.erb"),
    mode => "777"
  }

  file { "/home/vagrant/init.sh":
    ensure => present,
    owner => "vagrant",
    group => "vagrant",
    content => template("thmcards/init.sh.erb"),
    mode => "777"
  }

  exec { "init thm-cards":
    command => "/home/vagrant/init.sh",
    require => File['/home/vagrant/init.sh'],
    environment => ["HOME=/home/vagrant"]
  }

  class { "motd":
    template => "thmcards/motd.erb"
  }

  class { 'java': }
  class { 'maven::maven': } ->
  class { 'sonarqube':
    version => '3.7.4'
  }

  class { "jenkins":
      config_hash => {
        "HTTP_PORT" => { "value" => "9090" },
        "AJP_PORT" => { "value" => "9009" }
      },
      plugin_hash => {
        "sonar" => {},
        "javadoc" => {},
        "mailer" => {},
        "token-macro" =>{},
        "parameterized-trigger" => {},
        "build-pipeline-plugin" => {},
        "dashboard-view" => {},
        "maven-plugin" => {},
        "jquery"=>{},
         "git-client" => {},
        "scm-api" => {},
        "git" => {}
      }
    }

    # Jenkins might be installed to different paths depending on OS
    $jenkins_home = $::osfamily ? {
      "Debian" => "/var/lib/jenkins",
      "Ubuntu" => "/var/lib/jenkins",
      default => fail("Unsupported OS family: ${::osfamily}")
    }

    #file { "${jenkins_home}/hudson.tasks.Maven.xml":
    #  require => Class["jenkins::package"],
    #  source => "/etc/puppet/files/jenkins/hudson.tasks.Maven.xml",
    #  notify => Service["jenkins"]
    #}
}
