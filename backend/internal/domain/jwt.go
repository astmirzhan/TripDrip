package domain

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type AuthClaims struct {
	UserID     uuid.UUID `json:"uid"`
	Role       string    `json:"role"`
	IsVerified bool      `json:"verified"`
	TokenType  string    `json:"typ"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type TokenManager struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewTokenManager(secret string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		secret:     []byte(secret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
	}
}

func (m *TokenManager) GeneratePair(userID uuid.UUID, role string, isVerified bool) (*TokenPair, error) {
	now := time.Now()
	accessExp := now.Add(m.accessTTL)
	refreshExp := now.Add(m.refreshTTL)

	accessClaims := AuthClaims{
		UserID:     userID,
		Role:       role,
		IsVerified: isVerified,
		TokenType:  TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExp),
		},
	}

	refreshClaims := AuthClaims{
		UserID:     userID,
		Role:       role,
		IsVerified: isVerified,
		TokenType:  TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(refreshExp),
		},
	}

	accessTok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(m.secret)
	if err != nil {
		return nil, fmt.Errorf("sign access token: %w", err)
	}
	refreshTok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(m.secret)
	if err != nil {
		return nil, fmt.Errorf("sign refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessTok,
		RefreshToken: refreshTok,
		ExpiresIn:    int64(m.accessTTL.Seconds()),
	}, nil
}

func (m *TokenManager) Parse(tokenStr, expectedType string) (*AuthClaims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := tok.Claims.(*AuthClaims)
	if !ok || !tok.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.TokenType != expectedType {
		return nil, fmt.Errorf("unexpected token type: %s", claims.TokenType)
	}
	return claims, nil
}
