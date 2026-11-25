.PHONY: build run test sqlc-generate migrate-up migrate-down seed

build:
	go build -o bin/tripdrip-api.exe ./cmd/api

run:
	go run ./cmd/api

test:
	go test -v ./...

sqlc-generate:
	sqlc generate

migrate-up:
	goose -dir internal/db/migrations postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir internal/db/migrations postgres "$(DATABASE_URL)" down

seed:
	go run ./cmd/api --seed-only
