# --- Main Commands ---

# Start the development server (watches for changes)
dev:
	node ace serve --watch

# Fresh Migration & Seed (Resets DB and populates data)
fresh:
	node ace migration:fresh --seed

# Run all migrations (without dropping tables)
migrate:
	node ace migration:run

# Run seeders only
seed:
	node ace db:seed

# --- Generators (Make) ---

# Create a new Controller (Usage: make controller name=Users)
controller:
	node ace make:controller $(name)

# Create a new Model (Usage: make model name=User)
model:
	node ace make:model $(name)

# Create a new Migration (Usage: make migration name=create_users_table)
migration:
	node ace make:migration $(name)

# --- Utilities ---

# List all registered routes
routes:
	node ace list:routes

# Open the REPL (Interactive shell)
repl:
	node ace repl

# Run tests
test:
	node ace test

# Lint / Format (assuming you have eslint/prettier setup)
lint:
	npm run lint
	npm run format
