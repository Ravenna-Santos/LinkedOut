package com.va2es.backend.controllers;

import com.va2es.backend.dto.UpdateNameDTO;
import com.va2es.backend.models.User;
import com.va2es.backend.services.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PutMapping("/name")
    public ResponseEntity<Map<String, String>> updateName(@RequestBody @Valid UpdateNameDTO dto, @AuthenticationPrincipal User current) {
        User updatedUser = userService.updateName(current, dto.newName());

        return ResponseEntity.ok(Map.of(
                "message", "Nome atualizado com sucesso",
                "novoNome", updatedUser.getNome()
        ));
    }

    @GetMapping
    public ResponseEntity<List<User>> listarTodos() {
        return ResponseEntity.ok(userService.listarTodos());
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Usuário não autenticado"));
        }

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "nome", user.getNome(),
                "email", user.getEmail(),
                "role", user.getRole().name()
        ));
    }
}