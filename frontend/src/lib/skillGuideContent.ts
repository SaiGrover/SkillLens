import type { SkillSummary } from '@/services/api'

export interface SkillGuideSections {
  about: string
  useCases: string[]
  careerOutlook: string
  learningPath: string
}

const CATEGORY_CONTEXT: Record<string, string> = {
  'Data Analytics': 'turning raw data into actionable insights through exploration, reporting, and statistical reasoning',
  Programming: 'writing, debugging, and maintaining software that powers products, platforms, and automation',
  'Software Engineering': 'designing reliable systems, shipping features, and maintaining quality across the software lifecycle',
  AI_ML: 'building intelligent systems that learn from data, automate decisions, and power modern AI products',
  Cloud: 'deploying, scaling, and securing applications on distributed cloud infrastructure',
  DevOps: 'bridging development and operations through automation, CI/CD, and reliable release pipelines',
  Database: 'storing, querying, and governing structured and unstructured data at scale',
  Cybersecurity: 'protecting systems, networks, and data from threats, misuse, and unauthorized access',
  Engineering_Systems: 'applying engineering principles to hardware, embedded, and complex physical-digital systems',
  Tools_Platforms: 'using collaboration and delivery platforms that teams rely on to plan, build, and ship work',
}

const ARCHETYPE_OUTLOOK: Record<string, string> = {
  'Future-Proof': 'This skill sits in a high-confidence growth cluster â€” strong demand, adoption momentum, and positive forecast signals make it a priority for long-term career investment.',
  Emerging: 'This skill is gaining traction quickly. Early mastery can create outsized career advantage before the market becomes saturated.',
  Stable: 'This skill offers steady, durable relevance. It is less volatile than emerging tools but remains a dependable foundation across roles and industries.',
  'At-Risk': 'Workforce signals suggest weakening momentum. Pair this skill with adjacent high-SES capabilities to reduce career exposure.',
  Obsolete: 'Adoption and forecast signals are declining. Treat this as legacy knowledge and prioritize upskilling into stronger adjacent skills.',
}

const SKILL_ABOUT: Record<string, { about: string; useCases: string[]; learningPath: string }> = {
  'data-analysis': {
    about: 'Data Analysis is the practice of inspecting, cleaning, and interpreting datasets to answer business questions and support decisions. Analysts combine spreadsheets, SQL, visualization, and statistical thinking to translate numbers into recommendations.',
    useCases: ['Exploratory analysis for product and marketing teams', 'KPI tracking and executive reporting', 'Root-cause analysis for operational problems'],
    learningPath: 'Start with Excel or SQL fundamentals, then add visualization (Tableau/Power BI) and basic statistics before tackling domain-specific datasets.',
  },
  excel: {
    about: 'Excel is a spreadsheet application used for calculations, modeling, dashboards, and lightweight data analysis. It remains one of the most widely deployed analytics tools in finance, operations, and general business roles.',
    useCases: ['Financial modeling and budgeting', 'Pivot tables for ad-hoc reporting', 'Quick what-if analysis for stakeholders'],
    learningPath: 'Master formulas, pivot tables, and charts first, then move to Power Query and basic automation with macros or Python integration.',
  },
  'quality-assurance': {
    about: 'Quality Assurance (QA) ensures software meets requirements before release through test planning, execution, and defect tracking. QA professionals protect user trust by catching regressions and validating product behavior.',
    useCases: ['Manual and automated test case design', 'Regression testing before production releases', 'Defect triage with engineering teams'],
    learningPath: 'Learn testing fundamentals, bug-reporting workflows, and one automation stack (Selenium, Cypress, or Playwright).',
  },
  'microsoft-excel': {
    about: 'Microsoft Excel is the enterprise-standard spreadsheet platform within Microsoft 365. It supports advanced formulas, Power Query, pivot analytics, and integration with the broader Microsoft data stack.',
    useCases: ['Enterprise reporting tied to SharePoint and Power BI', 'Department-level forecasting models', 'Data preparation before BI ingestion'],
    learningPath: 'Build fluency in Excel tables, XLOOKUP, pivot charts, and Power Query before connecting workbooks to Power BI.',
  },
  python: {
    about: 'Python is a versatile programming language dominant in data science, backend development, automation, and AI engineering. Its readable syntax and rich ecosystem make it a default choice for prototyping and production alike.',
    useCases: ['Data pipelines and machine learning workflows', 'API backends with FastAPI or Django', 'Scripting and test automation'],
    learningPath: 'Learn core syntax and data structures, then branch into pandas for analytics or FastAPI/Django for backend roles.',
  },
  sql: {
    about: 'SQL (Structured Query Language) is the standard language for querying and manipulating relational databases. Nearly every analytics, engineering, and product role interacts with SQL to retrieve and transform data.',
    useCases: ['Ad-hoc analytics against warehouse tables', 'ETL transformations in dbt or Spark SQL', 'Application queries in backend services'],
    learningPath: 'Practice SELECT/JOIN/GROUP BY on PostgreSQL or SQLite, then study window functions, CTEs, and query optimization.',
  },
  'electrical-engineering': {
    about: 'Electrical Engineering covers the design and analysis of circuits, power systems, electronics, and signal processing. It underpins hardware products, IoT devices, and industrial control systems.',
    useCases: ['PCB and circuit design', 'Power distribution and renewable energy systems', 'Embedded sensor and control integration'],
    learningPath: 'Strengthen fundamentals in circuits, digital logic, and control theory, then specialize in embedded firmware or power electronics.',
  },
  'mechanical-engineering': {
    about: 'Mechanical Engineering applies physics and materials science to design machines, structures, and thermal systems. It spans automotive, aerospace, manufacturing, and robotics domains.',
    useCases: ['CAD-based product design and simulation', 'Manufacturing process optimization', 'Robotics and automation hardware'],
    learningPath: 'Build CAD proficiency (SolidWorks/Fusion), FEA basics, and materials knowledge before specializing in a vertical industry.',
  },
  java: {
    about: 'Java is a mature, statically typed language widely used in enterprise backends, Android development, and large-scale distributed systems. Its JVM ecosystem emphasizes portability, performance, and long-term maintainability.',
    useCases: ['Microservices on Spring Boot', 'High-throughput financial and banking platforms', 'Android application development'],
    learningPath: 'Learn OOP, collections, and concurrency, then progress to Spring Boot, JVM tuning, and cloud-native deployment patterns.',
  },
  aws: {
    about: 'Amazon Web Services (AWS) is the leading cloud platform offering compute, storage, networking, and managed services. AWS skills are essential for modern infrastructure, DevOps, and cloud-native application roles.',
    useCases: ['Deploying scalable web applications on EC2 and ECS', 'Data lakes and analytics on S3, Glue, and Redshift', 'Serverless architectures with Lambda and API Gateway'],
    learningPath: 'Start with core services (EC2, S3, IAM, VPC), earn Solutions Architect Associate, then specialize in data, security, or DevOps tracks.',
  },
  agile: {
    about: 'Agile is an iterative product-delivery methodology emphasizing collaboration, feedback loops, and incremental releases. Teams use Agile to respond quickly to changing requirements and reduce delivery risk.',
    useCases: ['Sprint planning and backlog refinement', 'Cross-functional product delivery', 'Continuous improvement through retrospectives'],
    learningPath: 'Understand Scrum or Kanban ceremonies, then practice writing user stories, estimating work, and facilitating retrospectives.',
  },
  'software-development': {
    about: 'Software Development is the end-to-end process of designing, coding, testing, and maintaining applications. It spans frontend, backend, mobile, and platform engineering across every industry.',
    useCases: ['Feature development for web and mobile products', 'Internal tooling and workflow automation', 'Integrations between business systems'],
    learningPath: 'Pick a language stack, learn Git and testing basics, then build portfolio projects that demonstrate system design thinking.',
  },
  testing: {
    about: 'Testing validates that software behaves correctly under expected and edge conditions. It spans manual verification, automated suites, performance checks, and security validation.',
    useCases: ['Smoke and regression test execution', 'Test automation in CI pipelines', 'Exploratory testing for new features'],
    learningPath: 'Study test design techniques, then add one automation framework and basic performance or security testing exposure.',
  },
  'machine-learning': {
    about: 'Machine Learning enables systems to learn patterns from data rather than relying on explicit rules. It powers recommendation engines, forecasting models, fraud detection, and generative AI applications.',
    useCases: ['Predictive models for business KPIs', 'Classification and ranking in product features', 'Feature engineering for production ML pipelines'],
    learningPath: 'Learn Python, linear algebra, and scikit-learn, then progress to deep learning frameworks and MLOps deployment practices.',
  },
  javascript: {
    about: 'JavaScript is the primary language of the web, running in browsers and on servers via Node.js. It powers interactive UIs, full-stack applications, and a vast npm ecosystem.',
    useCases: ['React/Vue/Angular single-page applications', 'Node.js APIs and serverless functions', 'Browser automation and tooling scripts'],
    learningPath: 'Master ES6+, DOM/async patterns, then specialize in a frontend framework and Node.js backend fundamentals.',
  },
  automation: {
    about: 'Automation replaces repetitive manual work with scripts, workflows, and orchestrated pipelines. In tech roles it spans test automation, infrastructure provisioning, and business process robotics.',
    useCases: ['CI/CD pipeline orchestration', 'RPA for finance and operations tasks', 'Infrastructure as code deployments'],
    learningPath: 'Learn scripting (Python/Bash), then connect automation to CI tools, cloud APIs, or RPA platforms based on your target role.',
  },
  'data-analytics': {
    about: 'Data Analytics is the discipline of examining datasets to discover trends, measure performance, and inform strategy. It bridges raw data infrastructure and business decision-making.',
    useCases: ['Marketing funnel and conversion analysis', 'Operational dashboards for leadership', 'A/B test readouts and experiment design'],
    learningPath: 'Combine SQL, spreadsheet or BI tooling, and statistics, then practice storytelling with real business datasets.',
  },
  'data-visualization': {
    about: 'Data Visualization transforms quantitative information into charts, dashboards, and interactive views that humans can interpret quickly. Effective visualization drives faster decisions and clearer communication.',
    useCases: ['Executive dashboards in Tableau or Power BI', 'Exploratory charting in Python or R', 'Embedded analytics in customer-facing products'],
    learningPath: 'Learn visual encoding principles, then master one BI tool and one code-based library (matplotlib, D3, or Observable).',
  },
  'software-engineering': {
    about: 'Software Engineering applies structured engineering practices to building reliable, maintainable software systems. It encompasses architecture, coding standards, testing, and operational excellence.',
    useCases: ['Designing scalable service architectures', 'Code review and engineering quality programs', 'Cross-team platform and framework development'],
    learningPath: 'Develop strong fundamentals in algorithms, system design, and testing, then deepen in a domain such as backend, frontend, or platform.',
  },
  linux: {
    about: 'Linux is the dominant operating system for servers, cloud instances, containers, and embedded devices. Command-line fluency on Linux is essential for DevOps, backend, and security roles.',
    useCases: ['Server administration and troubleshooting', 'Container host management', 'Shell scripting for deployment automation'],
    learningPath: 'Practice file permissions, process management, and bash scripting on a daily-driver VM or cloud instance.',
  },
  'cloud-computing': {
    about: 'Cloud Computing delivers compute, storage, and platform services over the internet on a pay-as-you-go model. It enables elastic scaling, global deployment, and reduced infrastructure capital expense.',
    useCases: ['Migrating on-prem workloads to cloud', 'Auto-scaling web and API services', 'Managed database and analytics platforms'],
    learningPath: 'Pick a hyperscaler (AWS, Azure, or GCP), learn core IaaS/PaaS services, then study architecture patterns and cost optimization.',
  },
  azure: {
    about: 'Microsoft Azure is a cloud platform integrated deeply with the Microsoft enterprise stack. It offers compute, AI, data, and identity services commonly adopted in corporate environments.',
    useCases: ['Enterprise .NET and Java deployments', 'Azure Data Factory and Synapse analytics', 'Hybrid cloud with Azure Arc'],
    learningPath: 'Start with Azure Fundamentals, then focus on the services aligned to your role â€” App Service, AKS, or Synapse.',
  },
  tableau: {
    about: 'Tableau is a leading business intelligence tool for interactive dashboards and visual analytics. Analysts use it to connect to databases, build calculated fields, and publish stories to stakeholders.',
    useCases: ['Self-service analytics for business teams', 'Executive KPI dashboards', 'Embedded analytics in customer portals'],
    learningPath: 'Learn data connections, calculated fields, and dashboard design, then study Tableau Prep and server publishing workflows.',
  },
  jira: {
    about: 'Jira is Atlassian\'s work-management platform used for agile planning, issue tracking, and delivery coordination. Engineering and product teams rely on it for sprint boards and release traceability.',
    useCases: ['Sprint backlog and kanban boards', 'Bug and incident tracking', 'Release and roadmap planning'],
    learningPath: 'Configure boards, workflows, and JQL queries, then integrate Jira with Confluence, Git, and CI status tools.',
  },
  kubernetes: {
    about: 'Kubernetes orchestrates containerized applications across clusters, handling scaling, networking, and self-healing. It is the de facto standard for cloud-native application deployment.',
    useCases: ['Microservice deployment and rolling updates', 'Horizontal pod autoscaling', 'Multi-environment GitOps delivery'],
    learningPath: 'Learn Docker first, then study pods, services, ingress, Helm, and CKA-level cluster operations.',
  },
  c: {
    about: 'C++ is a high-performance systems language used in game engines, trading systems, embedded firmware, and performance-critical backends. It offers fine-grained memory control and modern abstractions.',
    useCases: ['Low-latency trading and HPC workloads', 'Game engine and graphics programming', 'Embedded and robotics firmware'],
    learningPath: 'Master memory management, STL, and modern C++ features, then specialize in a domain such as systems, graphics, or quant.',
  },
  devops: {
    about: 'DevOps combines development and operations practices to ship software faster and more reliably. It emphasizes automation, observability, collaboration, and continuous delivery.',
    useCases: ['CI/CD pipeline design and maintenance', 'Infrastructure monitoring and incident response', 'Environment provisioning and release automation'],
    learningPath: 'Learn Linux, Git, Docker, and a CI platform, then add Kubernetes, Terraform, and observability tooling.',
  },
  docker: {
    about: 'Docker packages applications and dependencies into portable containers that run consistently across environments. Containers simplify local development, testing, and cloud deployment.',
    useCases: ['Consistent dev/staging/prod environments', 'Microservice packaging for Kubernetes', 'CI test isolation and reproducible builds'],
    learningPath: 'Practice writing Dockerfiles, compose multi-container apps, then study image optimization and registry security.',
  },
  statistics: {
    about: 'Statistics provides the mathematical foundation for inference, experimentation, and uncertainty quantification. It is essential for rigorous analytics, ML, and research-oriented roles.',
    useCases: ['Hypothesis testing for product experiments', 'Survey analysis and confidence intervals', 'Model evaluation and A/B test design'],
    learningPath: 'Study probability, distributions, and inference, then apply methods with Python (statsmodels) or R in real datasets.',
  },
  'statistical-analysis': {
    about: 'Statistical Analysis applies formal methods to summarize data, test hypotheses, and estimate effects. It turns noisy observations into defensible conclusions for business and research decisions.',
    useCases: ['Regression analysis for drivers of revenue', 'Quality control and process capability studies', 'Clinical or social science study analysis'],
    learningPath: 'Build on statistics fundamentals with regression, ANOVA, and experimental design, using SPSS, R, or Python.',
  },
  git: {
    about: 'Git is a distributed version control system that tracks code changes, enables branching workflows, and supports team collaboration. It is mandatory tooling for virtually all software roles.',
    useCases: ['Feature branching and pull request workflows', 'Release tagging and hotfix management', 'Code history audit and blame analysis'],
    learningPath: 'Learn commit, branch, merge, and rebase workflows, then integrate Git with GitHub/GitLab CI and code review practices.',
  },
  oracle: {
    about: 'Oracle Database is an enterprise relational database management system known for transactional workloads, PL/SQL, and large-scale OLTP deployments. It remains prevalent in finance, ERP, and legacy enterprise stacks.',
    useCases: ['High-volume OLTP applications', 'PL/SQL stored procedure development', 'Enterprise ERP and financial system backends'],
    learningPath: 'Study SQL and Oracle-specific PL/SQL, indexing, and backup/recovery before pursuing OCA/OCP certification.',
  },
  'power-bi': {
    about: 'Power BI is Microsoft\'s business analytics platform for modeling data, building dashboards, and sharing insights across organizations. It integrates tightly with Excel, Azure, and Microsoft 365.',
    useCases: ['Enterprise self-service BI', 'DAX-modeled semantic layers', 'Embedded analytics in Microsoft-centric orgs'],
    learningPath: 'Learn Power Query, data modeling, DAX measures, and report design, then publish via Power BI Service workspaces.',
  },
  sharepoint: {
    about: 'SharePoint is Microsoft\'s collaboration and document management platform. Teams use it for intranets, knowledge bases, workflow automation, and integration with Microsoft 365 apps.',
    useCases: ['Team sites and document libraries', 'Approval workflows and list automation', 'Intranet and knowledge management portals'],
    learningPath: 'Configure sites, permissions, and lists, then explore Power Automate integration and SharePoint Framework for custom apps.',
  },
  'ms-excel': {
    about: 'MS Excel refers to spreadsheet proficiency within the Microsoft Office suite â€” formulas, charts, pivot tables, and data preparation skills used across finance, operations, and analytics roles.',
    useCases: ['Budget tracking and variance analysis', 'Operational reporting templates', 'Lightweight data cleaning before BI import'],
    learningPath: 'Same as Excel: formulas â†’ pivots â†’ Power Query â†’ optional VBA or Python in Excel.',
  },
  programming: {
    about: 'Programming is the general capability of writing instructions that computers execute to solve problems. It underpins software engineering, data science, automation, and digital product development.',
    useCases: ['Application and script development', 'Algorithm implementation', 'Tooling and workflow automation'],
    learningPath: 'Choose one language, build small projects daily, then study data structures, debugging, and collaborative Git workflows.',
  },
  'business-intelligence': {
    about: 'Business Intelligence (BI) transforms organizational data into dashboards, reports, and KPIs for decision-makers. BI practitioners connect warehouses to semantic models and self-service analytics.',
    useCases: ['Executive scorecards and OKR tracking', 'Sales and marketing performance reporting', 'Operational SLA and throughput monitoring'],
    learningPath: 'Learn SQL and dimensional modeling, then master Power BI or Tableau and study data warehouse concepts.',
  },
  databases: {
    about: 'Databases are systems for persistently storing and querying structured data. Understanding database concepts â€” schemas, indexes, transactions â€” is foundational for backend, analytics, and data engineering roles.',
    useCases: ['Application persistence layers', 'Analytics against warehouse tables', 'Data modeling for new product features'],
    learningPath: 'Start with relational SQL databases, then explore NoSQL options and normalization vs. denormalization trade-offs.',
  },
  'data-science': {
    about: 'Data Science combines statistics, programming, and domain knowledge to extract insights and build predictive models from complex datasets. It spans exploration, experimentation, and ML deployment.',
    useCases: ['Predictive modeling for business outcomes', 'Customer segmentation and churn analysis', 'Experiment design and causal inference'],
    learningPath: 'Python + pandas + statistics â†’ scikit-learn â†’ communication via visualization and stakeholder presentations.',
  },
  'database-management': {
    about: 'Database Management covers administration, tuning, backup, security, and lifecycle operations for database systems. DBAs and platform engineers ensure data stores remain available, performant, and compliant.',
    useCases: ['Backup, recovery, and high availability setup', 'Index tuning and query performance optimization', 'Access control and compliance auditing'],
    learningPath: 'Deepen SQL skills, then study a specific RDBMS admin track (PostgreSQL, Oracle, or SQL Server) including replication and monitoring.',
  },
  'systems-engineering': {
    about: 'Systems Engineering integrates hardware, software, and human factors to design complex systems that meet requirements across their lifecycle. It is common in aerospace, defense, automotive, and infrastructure.',
    useCases: ['Requirements traceability for large programs', 'System architecture and interface design', 'Verification and validation planning'],
    learningPath: 'Study systems thinking, MBSE tools, and requirements management, then align with a domain such as automotive or aerospace.',
  },
  'artificial-intelligence': {
    about: 'Artificial Intelligence encompasses techniques that enable machines to perceive, reason, learn, and act. Modern AI spans classical ML, deep learning, NLP, computer vision, and generative models.',
    useCases: ['Intelligent assistants and chatbots', 'Computer vision for inspection and security', 'Recommendation and personalization engines'],
    learningPath: 'Build ML foundations, then specialize in NLP, vision, or generative AI while studying responsible AI and deployment constraints.',
  },
  cybersecurity: {
    about: 'Cybersecurity protects digital assets from unauthorized access, malware, and data breaches. Practitioners work across identity, network, application, and cloud security domains.',
    useCases: ['Security monitoring and incident response', 'Vulnerability assessment and patching programs', 'Security architecture and zero-trust design'],
    learningPath: 'Study networking and OS fundamentals, then pursue Security+ and hands-on labs in SOC, pentesting, or cloud security.',
  },
  'agile-development': {
    about: 'Agile Development applies iterative delivery practices within software teams â€” short cycles, continuous feedback, and adaptive planning. It pairs naturally with Scrum, Kanban, and DevOps workflows.',
    useCases: ['Incremental feature shipping with sprint demos', 'Backlog grooming with product owners', 'Cross-functional pairing and mob sessions'],
    learningPath: 'Participate actively in agile ceremonies, then deepen with Scrum Master or Product Owner certification if leading teams.',
  },
  'information-technology': {
    about: 'Information Technology (IT) covers the systems, networks, and support infrastructure that keep organizations running. IT roles span help desk, sysadmin, cloud ops, and enterprise application support.',
    useCases: ['Endpoint and identity management', 'Network and server administration', 'Enterprise application rollout and support'],
    learningPath: 'Build CompTIA A+/Network+ foundations, then specialize in cloud, security, or enterprise platforms like Microsoft 365.',
  },
  robotics: {
    about: 'Robotics combines mechanical design, electronics, control theory, and software to build autonomous or semi-autonomous machines. Applications span manufacturing, logistics, healthcare, and research.',
    useCases: ['Industrial automation and cobots', 'Autonomous navigation and SLAM', 'Robot operating system (ROS) development'],
    learningPath: 'Study mechanics, embedded C/Python, and ROS, then practice with simulation before hardware projects.',
  },
  react: {
    about: 'React is a JavaScript library for building component-based user interfaces. Its virtual DOM, hooks, and ecosystem make it the most widely adopted frontend framework for modern web apps.',
    useCases: ['Single-page applications and design systems', 'Interactive dashboards and admin panels', 'React Native mobile applications'],
    learningPath: 'Learn JSX, state/hooks, and component composition, then add React Router, data fetching, and testing with Vitest or RTL.',
  },
  matlab: {
    about: 'MATLAB is a numerical computing environment used heavily in engineering, signal processing, and academic research. It provides matrix operations, simulation toolboxes, and visualization for technical workflows.',
    useCases: ['Control systems and signal processing design', 'Academic research simulations', 'Prototype algorithms before production porting'],
    learningPath: 'Master matrix operations and plotting, then explore Simulink and domain toolboxes aligned to your engineering field.',
  },
  gcp: {
    about: 'Google Cloud Platform (GCP) offers cloud infrastructure with strengths in data analytics, Kubernetes (GKE), and ML services. It is widely used by data-heavy and AI-first organizations.',
    useCases: ['BigQuery analytics and Looker BI', 'GKE-managed Kubernetes workloads', 'Vertex AI model training and deployment'],
    learningPath: 'Earn Cloud Digital Leader or Associate Cloud Engineer, then specialize in data (BigQuery) or GKE operations.',
  },
  'unit-testing': {
    about: 'Unit Testing verifies individual functions or components in isolation, catching regressions early in development. It is a cornerstone of test-driven development and maintainable codebases.',
    useCases: ['TDD during feature development', 'CI gates that block failing builds', 'Refactoring safety nets for legacy code'],
    learningPath: 'Learn a framework for your stack (Jest, pytest, JUnit), practice mocking, and integrate tests into CI pipelines.',
  },
  'data-modeling': {
    about: 'Data Modeling defines how data is structured, related, and constrained in databases and warehouses. Good models balance normalization, query performance, and business semantics.',
    useCases: ['Star/snowflake schema design for warehouses', 'Entity-relationship modeling for OLTP apps', 'Semantic layer design for BI tools'],
    learningPath: 'Study ER diagrams and normalization, then practice dimensional modeling and tools like dbdiagram or ERwin.',
  },
  jenkins: {
    about: 'Jenkins is an open-source automation server for building CI/CD pipelines. Teams use it to compile code, run tests, and deploy artifacts across environments.',
    useCases: ['Multi-stage build and test pipelines', 'Scheduled jobs and cron automation', 'Integration with Git, Docker, and Kubernetes'],
    learningPath: 'Install Jenkins, write Jenkinsfile pipelines, then migrate toward cloud-native CI (GitHub Actions, GitLab CI) while retaining Jenkins ops skills.',
  },
  microservices: {
    about: 'Microservices architecture decomposes applications into independently deployable services communicating over APIs. It enables team autonomy, elastic scaling, and technology diversity at the cost of operational complexity.',
    useCases: ['Domain-driven service boundaries', 'Independent scaling of high-traffic components', 'Polyglot persistence across services'],
    learningPath: 'Understand REST/gRPC, containerization, service discovery, and observability before splitting monoliths.',
  },
  nosql: {
    about: 'NoSQL databases store data in non-relational formats â€” documents, key-value, column-family, or graphs. They trade flexible schemas and horizontal scale for different consistency guarantees than SQL.',
    useCases: ['Flexible product catalogs and user profiles', 'High-throughput session and cache stores', 'Graph queries for social and fraud networks'],
    learningPath: 'Learn when NoSQL fits vs. SQL, then practice with MongoDB or DynamoDB and study CAP theorem implications.',
  },
  typescript: {
    about: 'TypeScript adds static typing to JavaScript, catching errors at compile time and improving IDE support. It is the default choice for large-scale frontend and Node.js codebases.',
    useCases: ['Typed React and Next.js applications', 'Node.js APIs with shared type contracts', 'Monorepo libraries with strict type safety'],
    learningPath: 'Convert a small JS project to TS, learn generics and utility types, then adopt strict mode in team projects.',
  },
  terraform: {
    about: 'Terraform is an Infrastructure as Code tool for provisioning cloud resources declaratively. Teams version infrastructure alongside application code for reproducible environments.',
    useCases: ['Multi-cloud resource provisioning', 'Environment promotion (dev/staging/prod)', 'Module-based reusable infrastructure patterns'],
    learningPath: 'Write HCL for a small VPC + compute stack, use remote state, then study modules, workspaces, and policy as code.',
  },
  'ci-cd': {
    about: 'CI/CD (Continuous Integration / Continuous Delivery) automates building, testing, and deploying software on every change. It reduces release risk and accelerates feedback loops for engineering teams.',
    useCases: ['Automated test gates on pull requests', 'Blue-green or canary production deployments', 'Artifact promotion across environments'],
    learningPath: 'Set up a pipeline with GitHub Actions or GitLab CI, add automated tests, then implement staged deployments with rollback.',
  },
  confluence: {
    about: 'Confluence is Atlassian\'s team wiki for documentation, planning pages, and knowledge sharing. It integrates with Jira for linking specs, retrospectives, and runbooks to delivery work.',
    useCases: ['Technical design documents and ADRs', 'Team onboarding and runbooks', 'Product requirements linked to Jira epics'],
    learningPath: 'Structure spaces with templates, macros, and labels; integrate with Jira and establish doc review habits.',
  },
  coding: {
    about: 'Coding is the hands-on act of writing source code to implement logic, interfaces, and systems. It is the core craft skill underlying all software and many automation roles.',
    useCases: ['Implementing product features from specs', 'Bug fixes and performance improvements', 'Prototyping ideas before full engineering investment'],
    learningPath: 'Code daily on small problems (LeetCode, Advent of Code), then build end-to-end projects that include tests and deployment.',
  },
  'sql-server': {
    about: 'Microsoft SQL Server is an enterprise RDBMS common in .NET and Windows-centric organizations. It offers T-SQL, integration services (SSIS), and reporting services (SSRS).',
    useCases: ['Line-of-business .NET application backends', 'ETL with SSIS into warehouses', 'Enterprise reporting with SSRS/Power BI'],
    learningPath: 'Learn T-SQL, indexing, and admin basics, then explore Always On availability and Azure SQL migration paths.',
  },
  'data-engineering': {
    about: 'Data Engineering builds and maintains pipelines that ingest, transform, and deliver reliable datasets for analytics and ML. Engineers work with batch/stream processing, orchestration, and warehouse design.',
    useCases: ['ETL/ELT pipelines into Snowflake or BigQuery', 'Real-time event streaming with Kafka', 'Data quality monitoring and lineage tracking'],
    learningPath: 'Master SQL and Python, then learn Spark, Airflow, dbt, and cloud warehouse patterns end-to-end.',
  },
  'network-security': {
    about: 'Network Security protects data in transit and network infrastructure from intrusion, eavesdropping, and denial-of-service attacks. It spans firewalls, VPNs, segmentation, and zero-trust networking.',
    useCases: ['Firewall rule design and review', 'IDS/IPS monitoring and threat response', 'Secure remote access and VPN architecture'],
    learningPath: 'Study TCP/IP deeply, then pursue Network+ and hands-on firewall/packet analysis labs.',
  },
  angular: {
    about: 'Angular is a TypeScript-based frontend framework from Google for building structured, enterprise-scale web applications. It provides routing, forms, HTTP, and a comprehensive CLI toolchain.',
    useCases: ['Large enterprise SPAs with strict architecture', 'Internal admin and operations portals', 'Progressive web applications'],
    learningPath: 'Learn components, services, RxJS, and the Angular CLI, then study lazy loading and NgRx for complex state.',
  },
  'information-security': {
    about: 'Information Security (InfoSec) governs policies, controls, and practices that protect confidentiality, integrity, and availability of information assets across an organization.',
    useCases: ['Risk assessments and control frameworks (ISO 27001, NIST)', 'Security awareness and policy enforcement', 'Third-party vendor security reviews'],
    learningPath: 'Combine technical security skills with governance frameworks; consider CISSP or CISM for leadership tracks.',
  },
  'computer-engineering': {
    about: 'Computer Engineering bridges electrical engineering and computer science, focusing on hardware-software systems such as processors, embedded devices, and computer architecture.',
    useCases: ['Embedded firmware development', 'FPGA and ASIC design support', 'IoT device prototyping'],
    learningPath: 'Study digital logic, computer architecture, and C/assembly, then specialize in embedded RTOS or hardware design tools.',
  },
  electronics: {
    about: 'Electronics covers components, circuits, and systems that manipulate electrical signals. Skills apply to consumer devices, industrial controls, telecommunications, and IoT hardware.',
    useCases: ['Circuit prototyping and PCB layout', 'Sensor integration and signal conditioning', 'Hardware troubleshooting and repair'],
    learningPath: 'Learn Ohm\'s law, semiconductors, and schematic reading, then practice with breadboards and oscilloscope measurements.',
  },
  'system-design': {
    about: 'System Design is the practice of architecting scalable, reliable software systems â€” defining components, data flows, capacity plans, and failure modes before implementation.',
    useCases: ['Designing high-traffic APIs and data stores', 'Architecture reviews for new product initiatives', 'Interview and staff-engineer level design discussions'],
    learningPath: 'Study distributed systems primitives (load balancing, caching, sharding), then practice designing real systems on paper.',
  },
  mysql: {
    about: 'MySQL is a widely deployed open-source relational database used in web applications, especially with LAMP/LEMP stacks. It powers content management, e-commerce, and SaaS backends at scale.',
    useCases: ['WordPress and PHP application backends', 'Read-replica scaling for web traffic', 'Transactional OLTP for SaaS products'],
    learningPath: 'Learn SQL on MySQL, then study indexing, replication, and migration paths to managed cloud offerings (RDS, Cloud SQL).',
  },
  'node-js': {
    about: 'Node.js runs JavaScript on the server using an event-driven, non-blocking I/O model. It enables full-stack JavaScript teams and high-concurrency API services.',
    useCases: ['REST and GraphQL API backends', 'Real-time apps with WebSockets', 'Serverless functions on AWS Lambda or Vercel'],
    learningPath: 'Learn async patterns and Express/Fastify, then add TypeScript, testing, and production observability.',
  },
  'software-testing': {
    about: 'Software Testing is the structured discipline of verifying and validating software quality across functional, performance, and security dimensions before and after release.',
    useCases: ['Test plan creation for major releases', 'Automation framework maintenance', 'Quality metrics and defect trend reporting'],
    learningPath: 'Combine manual test design with automation (Selenium/Cypress) and exposure to performance tools like k6 or JMeter.',
  },
  'data-governance': {
    about: 'Data Governance defines policies, ownership, and quality standards for organizational data. It ensures compliance, trustworthy analytics, and responsible AI use.',
    useCases: ['Data catalog and lineage initiatives', 'GDPR/CCPA compliance programs', 'Master data management and stewardship roles'],
    learningPath: 'Learn DAMA-DMBOK concepts, metadata management, and partner with legal/compliance on regulatory frameworks.',
  },
  'agile-methodologies': {
    about: 'Agile Methodologies are family of iterative approaches â€” Scrum, Kanban, XP, and hybrids â€” that prioritize responding to change over rigid plans. They shape how modern product teams deliver software.',
    useCases: ['Team process selection and coaching', 'Hybrid agile-waterfall program management', 'Scaling agile across multiple squads (SAFe, LeSS)'],
    learningPath: 'Experience Scrum firsthand, then compare Kanban for flow-based teams and explore scaling frameworks if leading programs.',
  },
  'agile-methodology': {
    about: 'Agile Methodology refers to applying agile principles â€” customer collaboration, working software, and adaptive planning â€” within a team\'s delivery process, often via Scrum or Kanban.',
    useCases: ['Sprint execution and velocity tracking', 'Continuous backlog prioritization', 'Stakeholder demos and feedback incorporation'],
    learningPath: 'Same as agile: participate in ceremonies, facilitate retrospectives, and optionally certify as Scrum Master.',
  },
  hadoop: {
    about: 'Hadoop is an ecosystem for distributed storage (HDFS) and processing (MapReduce, later Spark) of big data. It pioneered scale-out analytics before cloud warehouses matured.',
    useCases: ['Historical batch analytics on petabyte logs', 'Data lake storage on HDFS', 'Legacy migration paths to Spark or cloud warehouses'],
    learningPath: 'Understand HDFS and YARN concepts, then prioritize Spark and cloud-native alternatives while maintaining legacy Hadoop ops knowledge.',
  },
  unix: {
    about: 'Unix and Unix-like systems (Linux, macOS) provide the foundational command-line environment for servers, developers, and security professionals. Shell proficiency is a career multiplier.',
    useCases: ['Remote server administration over SSH', 'Log analysis with grep, awk, and sed', 'Scripting deployment and backup routines'],
    learningPath: 'Daily terminal practice: navigation, pipes, permissions, and bash scripting on Linux or WSL.',
  },
  'big-data': {
    about: 'Big Data refers to datasets and processing pipelines too large or fast for traditional databases â€” requiring distributed storage, stream processing, and specialized analytics platforms.',
    useCases: ['Clickstream and telemetry analytics at scale', 'Real-time fraud detection pipelines', 'Lakehouse architectures combining batch and stream'],
    learningPath: 'Learn Spark, cloud warehouses, and streaming (Kafka/Flink), then study data lakehouse patterns with Delta/Iceberg.',
  },
  'cyber-security': {
    about: 'Cyber Security (alternate spelling) covers the same domain as cybersecurity â€” protecting systems and data from digital threats through technical controls, monitoring, and incident response.',
    useCases: ['SOC analyst triage and escalation', 'Penetration testing and red team exercises', 'Cloud security posture management'],
    learningPath: 'Build networking and OS foundations, then choose a track: blue team (SOC), red team (pentest), or cloud security.',
  },
  'plc-programming': {
    about: 'PLC Programming controls industrial machinery through Programmable Logic Controllers â€” ladder logic and structured text running on factory floors, utilities, and automation lines.',
    useCases: ['Assembly line automation sequences', 'Process control in manufacturing plants', 'Safety interlock and emergency stop logic'],
    learningPath: 'Learn ladder logic on vendor platforms (Allen-Bradley, Siemens), then study industrial networking and SCADA basics.',
  },
  'microsoft-azure': {
    about: 'Microsoft Azure is the full cloud platform brand encompassing compute, identity, data, and AI services in the Microsoft ecosystem â€” often the default cloud choice for enterprise Microsoft shops.',
    useCases: ['Hybrid identity with Azure AD', 'Azure Kubernetes Service deployments', 'Synapse and Fabric analytics pipelines'],
    learningPath: 'Follow AZ-900 â†’ AZ-104 or role-based paths aligned to developer, admin, or data engineer tracks.',
  },
  'continuous-integration': {
    about: 'Continuous Integration merges developer changes frequently into a shared repository, triggering automated builds and tests. It catches integration defects early and keeps mainline code releasable.',
    useCases: ['PR-triggered unit and integration test suites', 'Static analysis and lint gates', 'Artifact builds published on every merge'],
    learningPath: 'Configure CI on your repo (GitHub Actions), enforce test coverage thresholds, then extend to CD with staged deployments.',
  },
  'programming-languages': {
    about: 'Programming Languages as a skill domain means fluency across multiple languages and the ability to choose the right tool for performance, ecosystem, and team constraints.',
    useCases: ['Polyglot microservice development', 'Language migration and rewrite projects', 'Teaching and mentoring across stacks'],
    learningPath: 'Deepen one primary language, then learn a systems language (Go/Rust) and a scripting language (Python) for breadth.',
  },
  'c-c': {
    about: 'C/C++ combined proficiency covers both C\'s systems-level control and C++\'s object-oriented and template abstractions â€” common in performance-critical and embedded domains.',
    useCases: ['Legacy C codebase maintenance', 'Performance-sensitive C++ services', 'Game and graphics engine development'],
    learningPath: 'Master C memory and pointers, then C++ RAII, STL, and modern features; practice on open-source systems projects.',
  },
  etl: {
    about: 'ETL (Extract, Transform, Load) moves data from source systems into analytics-ready destinations. It is the backbone of data warehousing and business intelligence pipelines.',
    useCases: ['Nightly warehouse loads from operational DBs', 'Data cleansing and deduplication rules', 'Incremental syncs for reporting freshness'],
    learningPath: 'Learn SQL transformations, then tools like dbt, Airflow, or cloud-native ETL (Glue, Data Factory).',
  },
  github: {
    about: 'GitHub is the leading platform for Git hosting, code review, and collaborative open-source development. It also provides Actions for CI/CD, Issues for tracking, and Copilot for AI-assisted coding.',
    useCases: ['Pull request workflows and code review', 'GitHub Actions CI/CD pipelines', 'Open-source contribution and portfolio hosting'],
    learningPath: 'Master branching, PRs, and Actions YAML; explore branch protection, environments, and security scanning features.',
  },
  database: {
    about: 'Database skills encompass designing schemas, writing queries, and understanding storage engines for relational and non-relational systems â€” a core competency for builders and analysts alike.',
    useCases: ['Schema design for new application features', 'Query optimization for slow reports', 'Choosing SQL vs. NoSQL for new services'],
    learningPath: 'Start with PostgreSQL or MySQL, practice normalization and indexes, then explore one NoSQL and one warehouse platform.',
  },
  snowflake: {
    about: 'Snowflake is a cloud-native data warehouse separating storage and compute for elastic analytics. It supports SQL, semi-structured data, and secure data sharing across organizations.',
    useCases: ['Enterprise analytics warehouse', 'Secure data sharing with partners', 'ELT with dbt and Snowpipe ingestion'],
    learningPath: 'Learn Snowflake SQL, stages, tasks, and role-based access, then practice SnowPro Core certification topics.',
  },
  postgresql: {
    about: 'PostgreSQL is a powerful open-source relational database with advanced SQL, JSON support, and extensions. It is a default choice for modern application backends and analytics.',
    useCases: ['Primary OLTP database for SaaS apps', 'PostGIS geospatial applications', 'Analytics with foreign data wrappers and Citus scaling'],
    learningPath: 'Study SQL, indexing, and EXPLAIN plans, then explore replication, partitioning, and extension ecosystems.',
  },
  'objectoriented-programming': {
    about: 'Object-Oriented Programming (OOP) organizes code into objects with encapsulation, inheritance, and polymorphism. It remains the dominant paradigm in Java, C#, C++, and many enterprise codebases.',
    useCases: ['Domain modeling for business applications', 'Framework and library design', 'GUI and game engine architecture'],
    learningPath: 'Learn OOP in one language deeply, then study design patterns and when composition beats inheritance.',
  },
  'deep-learning': {
    about: 'Deep Learning uses neural networks with many layers to learn representations from raw data â€” powering image recognition, speech, NLP, and generative AI breakthroughs.',
    useCases: ['Computer vision classification and detection', 'Sequence models for time series and text', 'Generative models (GANs, diffusion, LLMs)'],
    learningPath: 'Linear algebra + PyTorch/TensorFlow â†’ CNNs/RNNs/Transformers â†’ fine-tuning and deployment with ONNX or Triton.',
  },
  apis: {
    about: 'APIs (Application Programming Interfaces) define contracts for software components to communicate â€” typically over HTTP REST, GraphQL, or gRPC. API design skills are essential for integration and platform roles.',
    useCases: ['Public developer platforms and partner integrations', 'Microservice boundary definitions', 'Third-party SaaS connectivity'],
    learningPath: 'Design RESTful resources, document with OpenAPI, then study auth (OAuth2), versioning, and rate limiting.',
  },
  php: {
    about: 'PHP is a server-side scripting language powering a large share of the web, especially WordPress, Laravel, and legacy LAMP applications. Modern PHP offers strong typing, frameworks, and performance improvements.',
    useCases: ['WordPress theme and plugin development', 'Laravel full-stack web applications', 'Legacy CMS maintenance and migration'],
    learningPath: 'Learn modern PHP (8.x), Composer, and Laravel or Symfony, then study security hardening and deployment.',
  },
  mongodb: {
    about: 'MongoDB is a document-oriented NoSQL database storing JSON-like BSON documents with flexible schemas. It suits rapid iteration, content platforms, and horizontally scaled applications.',
    useCases: ['Product catalogs and user-generated content', 'Mobile app backends with flexible schemas', 'Real-time analytics with aggregation pipelines'],
    learningPath: 'Practice CRUD and aggregation, index design, and replica sets, then study Atlas cloud operations and schema design patterns.',
  },
  'integration-testing': {
    about: 'Integration Testing verifies that multiple modules or services work correctly together â€” catching interface mismatches that unit tests miss. It sits between unit and end-to-end testing in the pyramid.',
    useCases: ['API contract tests between microservices', 'Database integration tests with test containers', 'Third-party sandbox integration validation'],
    learningPath: 'Use test containers or mocks for dependencies, automate in CI, and define clear boundaries vs. E2E scope.',
  },
  pytorch: {
    about: 'PyTorch is a deep learning framework favored for research and production ML with dynamic computation graphs and Pythonic APIs. It powers academic research and industry model training pipelines.',
    useCases: ['Custom neural network research', 'Fine-tuning LLMs and vision models', 'TorchScript and ONNX export for inference'],
    learningPath: 'Follow official tutorials on tensors and autograd, build CNN/RNN projects, then explore Lightning and deployment.',
  },
  'azure-devops': {
    about: 'Azure DevOps is Microsoft\'s suite for repos, pipelines, boards, and artifacts â€” providing end-to-end ALM for teams in the Azure and .NET ecosystem.',
    useCases: ['YAML pipeline CI/CD on Azure', 'Agile boards linked to Git repos', 'Package feeds for internal libraries'],
    learningPath: 'Configure repos and pipelines, integrate with Azure resources, then map concepts to GitHub Actions if migrating.',
  },
  api: {
    about: 'API design and consumption skills cover building and integrating HTTP/GraphQL/gRPC interfaces that connect applications, services, and third-party platforms.',
    useCases: ['Backend endpoint implementation', 'Client SDK integration', 'Webhook and event-driven integrations'],
    learningPath: 'Build a small REST API with auth, write OpenAPI specs, and consume third-party APIs with proper error handling.',
  },
  'data-architecture': {
    about: 'Data Architecture defines how data flows, is stored, and governed across an organization â€” spanning lakes, warehouses, marts, and real-time streams aligned to business domains.',
    useCases: ['Enterprise data mesh or lakehouse design', 'Migration from legacy warehouses', 'Canonical data models for analytics and ML'],
    learningPath: 'Study Kimball/Inmon modeling, cloud reference architectures, and partner with security on classification and access patterns.',
  },
  'computer-vision': {
    about: 'Computer Vision enables machines to interpret images and video â€” detecting objects, reading text, tracking motion, and supporting autonomous systems.',
    useCases: ['Quality inspection on manufacturing lines', 'Facial recognition and biometric systems', 'Medical imaging analysis assist'],
    learningPath: 'OpenCV basics â†’ CNN architectures â†’ transfer learning with PyTorch/TensorFlow â†’ edge deployment with TensorRT or ONNX.',
  },
  'embedded-systems': {
    about: 'Embedded Systems are dedicated computer systems within larger devices â€” microcontrollers running firmware for appliances, vehicles, medical devices, and IoT endpoints.',
    useCases: ['Firmware for sensors and actuators', 'RTOS-based control loops', 'Low-power battery-operated device software'],
    learningPath: 'Learn C, microcontrollers (Arduino/STM32), RTOS concepts, and debugging with JTAG/logic analyzers.',
  },
  tensorflow: {
    about: 'TensorFlow is Google\'s open-source ML platform spanning training (Keras), deployment (TensorFlow Serving, TFLite), and TPU acceleration. It remains widely used in production ML pipelines.',
    useCases: ['Production model training at scale', 'Mobile inference with TensorFlow Lite', 'TensorFlow Extended (TFX) ML pipelines'],
    learningPath: 'Keras high-level API first, then custom training loops, SavedModel export, and TFX or Vertex deployment.',
  },
  'system-testing': {
    about: 'System Testing validates complete integrated software against requirements â€” end-to-end behavior across modules, interfaces, and configured environments before acceptance.',
    useCases: ['Full regression before major releases', 'Environment-specific configuration validation', 'UAT preparation and defect baselines'],
    learningPath: 'Define test cases from requirements, automate where ROI is clear, and coordinate with QA leads on entry/exit criteria.',
  },
  'google-cloud': {
    about: 'Google Cloud encompasses GCP services and Google\'s data/AI stack â€” BigQuery, GKE, Vertex AI â€” optimized for analytics-heavy and Kubernetes-native organizations.',
    useCases: ['Analytics modernization on BigQuery', 'ML training on Vertex AI', 'Global app serving on Cloud Run and CDN'],
    learningPath: 'Cloud Digital Leader â†’ Associate Cloud Engineer â†’ specialize in data engineering or GKE security.',
  },
  'data-pipelines': {
    about: 'Data Pipelines orchestrate the movement and transformation of data from sources to consumers â€” batch, streaming, or hybrid â€” with reliability, monitoring, and schema evolution.',
    useCases: ['Scheduled warehouse loads', 'Event-driven stream processing', 'ML feature store refresh pipelines'],
    learningPath: 'Airflow or Prefect for orchestration, Spark or SQL for transforms, and observability with data quality checks.',
  },
  'agile-practices': {
    about: 'Agile Practices are tactical habits â€” daily standups, pair programming, trunk-based development, and continuous refinement â€” that make agile principles work on real teams.',
    useCases: ['Improving team flow and WIP limits', 'Reducing batch size of releases', 'Building psychological safety in retros'],
    learningPath: 'Experiment with one practice per sprint, measure outcomes, and adapt ceremonies to team context rather than dogma.',
  },
  'cloud-security': {
    about: 'Cloud Security secures cloud workloads through identity policies, network segmentation, encryption, and continuous posture assessment across IaaS, PaaS, and SaaS layers.',
    useCases: ['IAM least-privilege audits', 'CSPM misconfiguration remediation', 'Secrets management and key rotation'],
    learningPath: 'Learn shared responsibility model, then pursue CCSK or vendor certs (AWS Security Specialty, AZ-500).',
  },
  'natural-language-processing': {
    about: 'Natural Language Processing (NLP) enables computers to understand, generate, and transform human language â€” powering search, chatbots, translation, and large language models.',
    useCases: ['Document classification and entity extraction', 'Semantic search and RAG assistants', 'Sentiment analysis for customer feedback'],
    learningPath: 'Text preprocessing â†’ transformers (Hugging Face) â†’ prompt engineering and fine-tuning for domain tasks.',
  },
  golang: {
    about: 'Go (Golang) is a statically typed language from Google designed for simplicity, concurrency, and cloud infrastructure tooling. It powers Kubernetes, Docker, and many high-performance backend services.',
    useCases: ['Cloud microservices and CLI tools', 'Concurrent network servers', 'DevOps and platform engineering utilities'],
    learningPath: 'Learn goroutines, channels, and the standard library, then build a small HTTP service with tests and Docker deployment.',
  },
  'a-b-testing': {
    about: 'A/B Testing compares two or more variants to measure which performs better against a metric â€” foundational to product experimentation and data-driven decision culture.',
    useCases: ['Landing page and checkout optimization', 'Feature flag rollouts with measurement', 'Marketing campaign variant analysis'],
    learningPath: 'Study experimental design, sample size, and p-values, then use a platform (Optimizely, LaunchDarkly) or in-house tooling.',
  },
  gitlab: {
    about: 'GitLab is a DevOps platform combining Git repos, CI/CD pipelines, issue tracking, and security scanning in one application â€” popular for self-hosted and integrated ALM workflows.',
    useCases: ['GitLab CI multi-stage pipelines', 'Merge request workflows with approvals', 'Container registry and dependency scanning'],
    learningPath: 'Configure .gitlab-ci.yml, runners, and environments, then explore security and compliance features.',
  },
  'advanced-excel': {
    about: 'Advanced Excel covers power-user capabilities â€” complex formulas, Power Query, Power Pivot, macros, and dashboard design â€” for analysts who rely on spreadsheets as a primary analytics surface.',
    useCases: ['Multi-sheet financial models with scenarios', 'Automated reporting with Power Query refresh', 'Executive dashboards without a separate BI tool'],
    learningPath: 'Master INDEX-MATCH/XLOOKUP, Power Query M, DAX in Power Pivot, and optional VBA for repetitive automation.',
  },
  'performance-testing': {
    about: 'Performance Testing measures system behavior under load â€” latency, throughput, and resource usage â€” to prevent production failures during traffic spikes.',
    useCases: ['Load testing before product launches', 'Capacity planning for Black Friday scale', 'Regression detection after architecture changes'],
    learningPath: 'Learn k6, JMeter, or Gatling, define SLAs, and integrate performance gates into CI for critical paths.',
  },
  'penetration-testing': {
    about: 'Penetration Testing simulates attacker techniques to find exploitable vulnerabilities before adversaries do. Ethical hackers report findings with remediation guidance.',
    useCases: ['External network and web app pentests', 'Internal red team exercises', 'Post-remediation validation retests'],
    learningPath: 'Networking + OWASP Top 10 â†’ hands-on labs (HackTheBox, OSCP prep) â†’ responsible disclosure and report writing.',
  },
  'nosql-databases': {
    about: 'NoSQL Databases as a category includes document, key-value, wide-column, and graph stores optimized for scale, flexibility, or relationship-heavy queries respectively.',
    useCases: ['MongoDB for flexible product data', 'Redis for caching and sessions', 'Neo4j for fraud ring detection'],
    learningPath: 'Understand CAP trade-offs, deploy one document and one key-value DB in a project, then study operational concerns (sharding, backups).',
  },
}

function pct(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function demandLabel(value?: number) {
  const score = pct(value)
  if (score >= 75) return 'very high employer demand'
  if (score >= 50) return 'solid market demand'
  if (score >= 25) return 'moderate demand'
  return 'niche or emerging demand'
}

function salaryLabel(value?: number) {
  const premium = pct(value)
  if (premium >= 30) return 'commands a strong salary premium over market averages'
  if (premium >= 15) return 'offers a meaningful salary premium'
  if (premium >= 5) return 'carries a modest compensation uplift'
  return 'shows limited salary differentiation in current data'
}

function sesLabel(score?: number, tier?: string) {
  const value = pct(score)
  const tierText = tier ? ` (${tier} tier)` : ''
  if (value >= 70) return `scores ${value}/100 on the Skill Employability Score${tierText}, indicating strong relative safety`
  if (value >= 45) return `scores ${value}/100 on SES${tierText}, reflecting moderate employability in the dataset`
  return `scores ${value}/100 on SES${tierText}, suggesting careful pairing with higher-momentum skills`
}

function forecastSentence(trend?: string, method?: string) {
  const label = trend?.toLowerCase() ?? 'tracked'
  const methodText = method ? ` using the ${method} forecast model` : ''
  if (label.includes('explosive') || label.includes('growing')) {
    return `Workforce forecasts classify momentum as ${label}${methodText}, with upward trajectory in processed trend features.`
  }
  if (label.includes('declin')) {
    return `Forecasts flag a ${label} trend${methodText}; consider upskilling into adjacent high-growth capabilities.`
  }
  return `Forecasts currently read as ${label}${methodText}, indicating steady rather than volatile workforce movement.`
}

function fallbackAbout(skill: SkillSummary) {
  const category = skill.category ?? 'technical work'
  const context = CATEGORY_CONTEXT[category] ?? `supporting ${category.toLowerCase()} workflows across modern organizations`
  return `${skill.name} is a workforce capability in ${category}, focused on ${context}. It appears in job postings, salary signals, and adoption metrics tracked by the HSEP pipeline.`
}

function fallbackUseCases(skill: SkillSummary) {
  return [
    `Applied in ${skill.category ?? 'cross-functional'} roles requiring ${skill.name}`,
    'Referenced in LinkedIn demand and industry skill clusters',
    'Useful alongside related skills in the same category for career breadth',
  ]
}

function fallbackLearningPath(skill: SkillSummary) {
  return `Build foundational literacy in ${skill.name}, practice on a portfolio project, then pair it with complementary ${skill.category ?? 'adjacent'} skills ranked highly in SES.`
}

export function buildSkillGuide(skill: SkillSummary & { description?: string; current_usage?: number; future_interest?: number; global_adoption?: number }): SkillGuideSections {
  const entry = SKILL_ABOUT[skill.id]
  const apiDescription = skill.description?.trim()
  const hasRichApiDescription = apiDescription && !/tracked from the processed HSEP/i.test(apiDescription)

  const about = hasRichApiDescription
    ? apiDescription
    : entry?.about ?? fallbackAbout(skill)

  const useCases = entry?.useCases ?? fallbackUseCases(skill)

  const archetype = skill.archetype ?? 'Stable'
  const archetypeOutlook = ARCHETYPE_OUTLOOK[archetype] ?? ARCHETYPE_OUTLOOK.Stable

  const careerOutlook = [
    `${skill.name} ${sesLabel(skill.ses_score, skill.ses_tier)} and shows ${demandLabel(skill.linkedin_demand)}.`,
    `Compensation signals ${salaryLabel(skill.salary_premium)}.`,
    forecastSentence(skill.forecast_trend, skill.forecast_method),
    archetypeOutlook,
  ].join(' ')

  const learningPath = entry?.learningPath ?? fallbackLearningPath(skill)

  return { about, useCases, careerOutlook, learningPath }
}

export function formatCategoryLabel(category?: string) {
  if (!category) return 'Unassigned'
  return category.replace(/_/g, ' / ')
}
