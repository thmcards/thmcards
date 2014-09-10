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

  class { 'sonarqube': }

  class { "jenkins":
      config_hash => {
        "HTTP_PORT" => { "value" => "9090" },
        "AJP_PORT" => { "value" => "9009" }
      },
      plugin_hash => {
        "selenium"=>{},
        "javadoc"=>{},
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
        "maven-plugin"=> {},
        "mailer"=>{}
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
